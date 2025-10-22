import { render } from '@testing-library/react';
import App from '../pages/App';

it('renders app', () => {
  render(<App />);
  // The app should render without crashing
  expect(document.body).toBeInTheDocument();
});
