import { fireEvent, render, screen } from '@testing-library/react-native';
import { Field } from './Field';

describe('Field password toggle', () => {
  it('shows a "Show password" toggle for secure fields and flips it on tap', async () => {
    await render(
      <Field label="Password" value="hunter2" onChangeText={() => {}} secureTextEntry />,
    );
    const toggle = screen.getByLabelText('Show password');
    expect(toggle).toBeTruthy();
    await fireEvent.press(toggle);
    expect(screen.getByLabelText('Hide password')).toBeTruthy();
  });

  it('renders no reveal toggle for a non-secure field', async () => {
    await render(<Field label="Email" value="a@b.co" onChangeText={() => {}} />);
    expect(screen.queryByLabelText('Show password')).toBeNull();
    expect(screen.queryByLabelText('Hide password')).toBeNull();
  });
});
