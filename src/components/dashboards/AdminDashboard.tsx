import { LayoutDashboard, Package, ReceiptText, RefreshCw, Users } from 'lucide-react';
import { useState } from 'react';
import type { SessionUser } from '../../lib/auth';
import type { Vendor } from '../../lib/types';
import OrdersSection from './admin/OrdersSection';
import Overview from './admin/Overview';
import ProductsSection from './admin/ProductsSection';
import VendorDialog from './admin/VendorDialog';
import VendorsSection from './admin/VendorsSection';
import { useAdminWorkspace } from './hooks/useAdminWorkspace';
import { useSection } from './hooks/useSection';
import { useRequiredSession } from './hooks/useSession';
import { DashboardShell, ErrorNote, Notice, SessionGate, secondaryButton, type NavItem } from './ui';

const SECTIONS = ['overview', 'vendors', 'products', 'orders'] as const;
type Section = (typeof SECTIONS)[number];

const HEADERS: Record<Section, { title: string; description: string }> = {
	overview: { title: 'Marketplace overview', description: 'Order intents from Order Now clicks and the commission each vendor owes.' },
	vendors: { title: 'Vendors', description: 'Approve new shops, pause a shop, or set a special commission rate.' },
	products: { title: 'Products', description: 'Every listing across vendors, including shops that are not live.' },
	orders: { title: 'Order intents', description: 'The commission ledger. Rows are never edited or removed.' },
};

export default function AdminDashboard() {
	const session = useRequiredSession('admin');
	return <SessionGate state={session}>{(user) => <Admin user={user} />}</SessionGate>;
}

function Admin({ user }: { user: SessionUser }) {
	const [section, go] = useSection(SECTIONS);
	const { summary, updateVendor } = useAdminWorkspace();
	/** Vendor the order intents view is narrowed to; '' for all. */
	const [vendorFilter, setVendorFilter] = useState('');
	const [managing, setManaging] = useState<Vendor | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const data = summary.data;

	const nav: NavItem<Section>[] = [
		{ id: 'overview', label: 'Overview', icon: LayoutDashboard },
		{ id: 'vendors', label: 'Vendors', icon: Users, count: data?.totals.vendors },
		{ id: 'products', label: 'Products', icon: Package, count: data?.totals.products },
		{ id: 'orders', label: 'Order intents', icon: ReceiptText, count: data?.totals.orderIntents },
	];

	function showIntentsFor(vendorId: string) {
		setVendorFilter(vendorId);
		go('orders');
	}

	function vendorSaved(vendor: Vendor, message: string) {
		setManaging(null);
		setNotice(`${vendor.name}: ${message}`);
	}

	return (
		<DashboardShell
			role="admin"
			user={user}
			nav={nav}
			section={section}
			workspace="Your Products Your Dreams"
			actions={
				<button type="button" className={secondaryButton} onClick={summary.reload} disabled={summary.loading}>
					<RefreshCw className={`size-4 ${summary.loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
				</button>
			}
			{...HEADERS[section]}
		>
			{summary.error && <ErrorNote message={summary.error} onRetry={summary.reload} />}
			{notice && <Notice message={notice} onDismiss={() => setNotice(null)} />}

			{section === 'overview' && <Overview data={data} onVendor={showIntentsFor} onManage={setManaging} />}
			{section === 'vendors' && <VendorsSection vendors={data?.vendors ?? null} onVendor={showIntentsFor} onManage={setManaging} />}
			{section === 'products' && <ProductsSection vendors={data?.vendors ?? null} productStats={data?.productStats ?? null} />}
			{section === 'orders' && <OrdersSection data={data} vendorFilter={vendorFilter} onVendorFilter={setVendorFilter} />}

			{managing && (
				<VendorDialog
					vendor={managing}
					onClose={() => setManaging(null)}
					onSave={(changes) => updateVendor(managing.id, changes)}
					onSaved={vendorSaved}
					onShowIntents={() => {
						setManaging(null);
						showIntentsFor(managing.id);
					}}
				/>
			)}
		</DashboardShell>
	);
}
