import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { CreateInvoicePage } from './features/invoices/CreateInvoicePage';
import { InvoiceDetailPage } from './features/invoices/InvoiceDetailPage';
import { InvoiceListPage } from './features/invoices/InvoiceListPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<InvoiceListPage />} />
          <Route path="/invoices/new" element={<CreateInvoicePage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
