import { render, screen } from '@testing-library/react';
import Footer from './components/Footer';

test('renders footer copyright text', () => {
  render(<Footer />);
  const textElement = screen.getByText(/IDP Education Platform/i);
  expect(textElement).toBeInTheDocument();
});
