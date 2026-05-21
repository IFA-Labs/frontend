import type { Metadata } from 'next';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import RequestDataField from '@/components/request-data-field';

export const metadata: Metadata = {
  title: 'Request New Data Field',
  description:
    'Request a new IFA LABS data field for your project, chain, and ticker requirements.',
  alternates: {
    canonical: 'https://ifalabs.com/request-data-field',
  },
};

export default function RequestDataFieldPage() {
  return (
    <div>
      <Navbar />
      <RequestDataField />
      <Footer />
    </div>
  );
}
