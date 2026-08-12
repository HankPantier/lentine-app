import type { ReactNode } from 'react';
import { View } from 'react-native';
import RenderHtml, { type MixedStyleRecord } from 'react-native-render-html';
import type { RecipeStructured } from '@/lib/articles';
import { colors, fg, fonts } from '@/theme/tokens';
import { Text } from './Text';

/**
 * Native render of a recipe's structured ACF data (from the wp-articles `article` action). Where
 * the plain HTML body forced react-native-render-html to lay everything out as flowing text, this
 * builds the recipe as designed: eyebrow section headers, a two-column flavor grid, an aligned
 * ingredient amount column, and numbered step badges. Prose fragments (notes, flavor notes, each
 * step's body) are still HTML, rendered with RNRH inside the native structure.
 */

const SYSTEM_FONTS = [fonts.regular, fonts.semibold, fonts.bold, fonts.italic];
const PROSE_BASE = { color: colors.blue, fontFamily: fonts.regular, fontSize: 15, lineHeight: 23 };
const PROSE_TAGS: MixedStyleRecord = {
  a: { color: colors.blueBright, textDecorationLine: 'none' },
  p: { marginTop: 0, marginBottom: 8 },
  strong: { fontFamily: fonts.bold },
  em: { fontFamily: fonts.italic },
  ul: { marginTop: 4, marginBottom: 8 },
  ol: { marginTop: 4, marginBottom: 8 },
  li: { lineHeight: 23 },
  // Give inline photos breathing room — bottom is 2x the top.
  img: { marginTop: 16, marginBottom: 32 },
};

function Prose({ html, width }: { html: string; width: number }) {
  return (
    <RenderHtml
      contentWidth={width}
      source={{ html }}
      baseStyle={PROSE_BASE}
      systemFonts={SYSTEM_FONTS}
      tagsStyles={PROSE_TAGS}
      enableExperimentalMarginCollapsing
    />
  );
}

/** A white card with the eyebrow section header + navy underline rule. */
function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray,
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 20,
        marginBottom: 14,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bold,
          fontSize: 12,
          lineHeight: 16,
          letterSpacing: 0.7,
          textTransform: 'uppercase',
          color: colors.blueBright,
          borderBottomWidth: 1,
          borderBottomColor: colors.blue,
          paddingBottom: 10,
          marginBottom: 12,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

export function RecipeBody({
  structured,
  contentWidth,
}: {
  structured: RecipeStructured;
  contentWidth: number;
}) {
  const innerWidth = Math.max(contentWidth - 36, 200); // minus the card's 18px horizontal padding
  const { notes, flavor, ingredient_sections: sections, instructions } = structured;
  const tastes = flavor?.tastes ?? [];
  const hasFlavor = !!(flavor?.notes || tastes.length);

  return (
    <View>
      {notes ? (
        <SectionCard title="Recipe Notes">
          <Prose html={notes} width={innerWidth} />
        </SectionCard>
      ) : null}

      {hasFlavor ? (
        <SectionCard title="Flavor Notes">
          {flavor.notes ? <Prose html={flavor.notes} width={innerWidth} /> : null}
          {tastes.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 }}>
              {tastes.map((t, i) => (
                <View
                  key={t.label}
                  style={{
                    width: '50%',
                    paddingVertical: 8,
                    paddingRight: i % 2 === 0 ? 10 : 0,
                    // Rows past the first (2 per row) get a hairline top edge as a separator.
                    borderTopWidth: i >= 2 ? 1 : 0,
                    borderTopColor: colors.gray,
                  }}
                >
                  <Text
                    style={{
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      fontSize: 10,
                      fontFamily: fonts.bold,
                      color: colors.blueBright,
                      marginBottom: 3,
                    }}
                  >
                    {t.label}
                  </Text>
                  <Text style={{ fontSize: 14, lineHeight: 19, color: colors.blue }}>{t.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </SectionCard>
      ) : null}

      {sections.length ? (
        <SectionCard title="Ingredients">
          {sections.map((section, si) => (
            <View key={si}>
              {section.headline ? (
                <Text
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                    fontSize: 11,
                    fontFamily: fonts.bold,
                    color: fg.tertiary,
                    marginTop: si === 0 ? 4 : 16,
                    marginBottom: 6,
                  }}
                >
                  {section.headline}
                </Text>
              ) : null}
              {section.items.map((it, ii) => (
                <View
                  key={ii}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                    paddingVertical: 7,
                    borderBottomWidth: ii === section.items.length - 1 ? 0 : 1,
                    borderBottomColor: colors.gray,
                  }}
                >
                  <Text
                    style={{ width: 58, textAlign: 'right', fontFamily: fonts.bold, fontSize: 14, color: colors.blue }}
                  >
                    {it.amount || '—'}
                  </Text>
                  <Text style={{ flex: 1, fontSize: 15, lineHeight: 20, color: colors.blue }}>{it.item}</Text>
                </View>
              ))}
            </View>
          ))}
        </SectionCard>
      ) : null}

      {instructions.length ? (
        <SectionCard title="Instructions">
          {instructions.map((step, i) => (
            <View key={i} style={{ marginBottom: i === instructions.length - 1 ? 0 : 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: colors.blue,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.blue }}>{i + 1}</Text>
                </View>
                {step.headline ? (
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.blue }}>
                    {step.headline}
                  </Text>
                ) : null}
              </View>
              {step.content ? (
                <View style={{ paddingLeft: 36, marginTop: 6 }}>
                  <Prose html={step.content} width={Math.max(innerWidth - 36, 160)} />
                </View>
              ) : null}
            </View>
          ))}
        </SectionCard>
      ) : null}
    </View>
  );
}
