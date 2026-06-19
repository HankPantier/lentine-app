-- Extract one row per active subscriber from a loaded WordPress/WooCommerce dump.
-- Subscriptions live in the legacy post store (wp_posts type 'shop_subscription'); HPOS
-- (wp_wc_orders) is empty in this dump. Requires MySQL 8 (window function in `tok`).
--
-- The active-status set is templated: extract.mjs replaces the @STATUS_LIST@ marker with a
-- quoted IN-list (default 'wc-active','wc-on-hold'). Everything else is fixed.

WITH sub AS (
  SELECT ID, post_status, post_date_gmt
  FROM wp_posts
  WHERE post_type = 'shop_subscription'
    AND post_status IN (/* @STATUS_LIST@ */ 'wc-active', 'wc-on-hold')
),
meta AS (
  SELECT
    post_id,
    MAX(CASE WHEN meta_key = '_customer_user'        THEN meta_value END) AS customer_user,
    MAX(CASE WHEN meta_key = '_billing_period'        THEN meta_value END) AS billing_period,
    MAX(CASE WHEN meta_key = '_billing_interval'      THEN meta_value END) AS billing_interval_n,
    MAX(CASE WHEN meta_key = '_schedule_start'        THEN meta_value END) AS schedule_start,
    MAX(CASE WHEN meta_key = '_schedule_next_payment' THEN meta_value END) AS schedule_next_payment,
    MAX(CASE WHEN meta_key = '_schedule_end'          THEN meta_value END) AS schedule_end,
    MAX(CASE WHEN meta_key = '_wcpay_subscription_id' THEN meta_value END) AS stripe_subscription_id,
    MAX(CASE WHEN meta_key = '_stripe_customer_id'    THEN meta_value END) AS stripe_customer_id
  FROM wp_postmeta
  WHERE post_id IN (SELECT ID FROM sub)
  GROUP BY post_id
),
line AS (
  -- product/line-item name carries the tier ("Recipe ..." vs "Back to Forward ...").
  SELECT order_id, MIN(order_item_name) AS product_name
  FROM wp_woocommerce_order_items
  WHERE order_item_type = 'line_item'
    AND order_id IN (SELECT ID FROM sub)
  GROUP BY order_id
),
tok AS (
  -- default saved card per user: the Stripe payment-method token + display meta.
  SELECT user_id, token, last4, exp_month, exp_year
  FROM (
    SELECT
      pt.user_id,
      pt.token,
      pt.token_id,
      pt.is_default,
      MAX(CASE WHEN m.meta_key = 'last4'        THEN m.meta_value END) AS last4,
      MAX(CASE WHEN m.meta_key = 'expiry_month' THEN m.meta_value END) AS exp_month,
      MAX(CASE WHEN m.meta_key = 'expiry_year'  THEN m.meta_value END) AS exp_year,
      ROW_NUMBER() OVER (
        PARTITION BY pt.user_id
        ORDER BY pt.is_default DESC, pt.token_id DESC
      ) AS rn
    FROM wp_woocommerce_payment_tokens pt
    LEFT JOIN wp_woocommerce_payment_tokenmeta m ON m.payment_token_id = pt.token_id
    WHERE pt.gateway_id = 'woocommerce_payments'
    GROUP BY pt.token_id
  ) ranked
  WHERE rn = 1
),
cust_stripe AS (
  -- User-level Stripe customer id (cus_…), taken from the most recent of the customer's
  -- orders/subscriptions that carries one. Fallback for subscriptions whose own postmeta
  -- lacks _stripe_customer_id; the id is per-customer, so any of their orders is valid.
  SELECT user_id, stripe_customer_id
  FROM (
    SELECT
      CAST(cu.meta_value AS UNSIGNED) AS user_id,
      sc.meta_value                   AS stripe_customer_id,
      ROW_NUMBER() OVER (
        PARTITION BY CAST(cu.meta_value AS UNSIGNED)
        ORDER BY p.post_date_gmt DESC
      ) AS rn
    FROM wp_posts p
    JOIN wp_postmeta sc ON sc.post_id = p.ID AND sc.meta_key = '_stripe_customer_id' AND sc.meta_value <> ''
    JOIN wp_postmeta cu ON cu.post_id = p.ID AND cu.meta_key = '_customer_user'
    WHERE p.post_type IN ('shop_order', 'shop_subscription')
  ) ranked
  WHERE rn = 1
)
SELECT
  sub.ID                AS wp_subscription_id,
  sub.post_status       AS wc_status,
  sub.post_date_gmt     AS subscription_created_gmt,
  u.ID                  AS wp_user_id,
  u.user_email          AS email,
  u.user_login          AS user_login,
  u.display_name        AS display_name,
  u.user_registered     AS user_registered,
  meta.billing_period,
  meta.billing_interval_n,
  meta.schedule_start,
  meta.schedule_next_payment,
  meta.schedule_end,
  meta.stripe_subscription_id,
  line.product_name,
  COALESCE(meta.stripe_customer_id, cs.stripe_customer_id) AS stripe_customer_id,
  tok.token             AS payment_token,
  tok.last4             AS card_last4,
  tok.exp_month         AS card_exp_month,
  tok.exp_year          AS card_exp_year
FROM sub
JOIN meta      ON meta.post_id = sub.ID
JOIN wp_users  u  ON u.ID = CAST(meta.customer_user AS UNSIGNED)
LEFT JOIN line ON line.order_id = sub.ID
LEFT JOIN tok  ON tok.user_id = u.ID
LEFT JOIN cust_stripe cs ON cs.user_id = u.ID
ORDER BY u.ID, sub.ID;
