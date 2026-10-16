import { LayoutDashboard, Package, Plus, ReceiptText, Store } from 'lucide-react';
import { useState } from 'react';
import type { SessionUser } from '../../lib/auth';
import type { ShopVisibility } from '../../lib/dashboard';
import type { Product } from '../../lib/types';
import { useSection } from './hooks/useSection';
import { useRequiredSession } from './hooks/useSession';
import { useVendorWorkspace } from './hooks/useVendorWorkspace';
import { DeleteDialog, ProductDrawer } from './ProductEditor';
import { DashboardShell, ErrorNote, Notice, SessionGate, StatusNote, primaryButton, type NavItem } from './ui';
import OrdersSection from './vendor/OrdersSection';
import Overview from './vendor/Overview';
import ProductsSection from './vendor/ProductsSection';
import ShopSection from './vendor/ShopSection';

const SECTIONS = ['overview', 'products', 'orders', 'shop'] as const;
type Section = (typeof SECTIONS)[number];

type Editing = { mode: 'add' } | { mode: 'edit'; product: Product };

const HEADERS: Record<Section, { title?: string; description: string; canAdd: boolean }> = {
	// No title: the overview is headed by the shop name.
	overview: { description: 'How your shop is doing. Buyers order your products on WhatsApp.', canAdd: true },
	products: { title: 'Products', description: 'Everything listed in your shop.', canAdd: true },
	orders: { title: 'Order intents', description: 'Every Order Now click on your products, with the commission it adds.', canAdd: false },
	shop: { title: 'Shop & billing', description: 'Your shop details and how commission is charged.', canAdd: false },
};

export default function VendorDashboard() {
	const session = useRequiredSession('vendor');
	return <SessionGate state={session}>{(user) => <SellerCenter user={user} />}</SessionGate>;
}

function SellerCenter({ user }: { user: SessionUser }) {
	const [section, go] = useSection(SECTIONS);
	const workspace = useVendorWorkspace();
	const [editing, setEditing] = useState<Editing | null>(null);
	const [deleting, setDeleting] = useState<Product | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const { vendor, products, insights, visibility } = workspace;

	const nav: NavItem<Section>[] = [
		{ id: 'overview', label: 'Overview', icon: LayoutDashboard },
		{ id: 'products', label: 'Products', icon: Package, count: products?.length },
		{ id: 'orders', label: 'Order intents', icon: ReceiptText, count: insights.data?.totals.orderIntents },
		{ id: 'shop', label: 'Shop & billing', icon: Store },
	];

	const addButton = <AddProductButton onClick={() => setEditing({ mode: 'add' })} />;
	const shopName = vendor?.name ?? user.name;
	const header = HEADERS[section];

	function saved(product: Product) {
		const isNew = editing?.mode === 'add';
		if (isNew) workspace.productAdded(product);
		else workspace.productUpdated(product);
		setEditing(null);
		setNotice(savedMessage(product, isNew, visibility?.visible ?? false));
		if (isNew) go('products');
	}

	function deleted(product: Product) {
		workspace.productDeleted(product.id);
		setDeleting(null);
		setNotice(`“${product.title}” was deleted.`);
	}

	return (
		<DashboardShell
			role="vendor"
			user={user}
			nav={nav}
			section={section}
			workspace={shopName}
			title={header.title ?? shopName}
			description={header.description}
			actions={header.canAdd ? addButton : undefined}
		>
			{workspace.error && <ErrorNote message={workspace.error} />}
			{insights.error && <ErrorNote message={insights.error} onRetry={insights.reload} />}
			{visibility && <ShopStatusNote visibility={visibility} />}
			{notice && <Notice message={notice} onDismiss={() => setNotice(null)} />}

			{section === 'overview' && <Overview workspace={workspace} addButton={addButton} />}
			{section === 'products' && (
				<ProductsSection
					workspace={workspace}
					addButton={addButton}
					onEdit={(product) => setEditing({ mode: 'edit', product })}
					onDelete={setDeleting}
				/>
			)}
			{section === 'orders' && <OrdersSection insights={insights.data} />}
			{section === 'shop' && <ShopSection workspace={workspace} email={user.email} onSaved={() => setNotice('Shop details saved.')} />}

			{editing && (
				<ProductDrawer product={editing.mode === 'edit' ? editing.product : null} onClose={() => setEditing(null)} onSaved={saved} />
			)}
			{deleting && <DeleteDialog product={deleting} onClose={() => setDeleting(null)} onDeleted={deleted} />}
		</DashboardShell>
	);
}

function savedMessage(product: Product, isNew: boolean, shopVisible: boolean): string {
	if (!isNew) return `“${product.title}” was updated.`;
	return shopVisible
		? `“${product.title}” is live on the storefront. Copy its link to share it.`
		: `“${product.title}” is saved. It goes live as soon as your shop is approved.`;
}

function ShopStatusNote({ visibility }: { visibility: ShopVisibility }) {
	if (!visibility.vendorMessage) return null;
	return (
		<StatusNote tone={visibility.tone === 'danger' ? 'danger' : 'warning'} title={`Shop ${visibility.label.toLowerCase()}`}>
			{visibility.vendorMessage}
		</StatusNote>
	);
}

function AddProductButton({ onClick }: { onClick: () => void }) {
	return (
		<button type="button" className={primaryButton} onClick={onClick}>
			<Plus className="size-4" aria-hidden="true" /> Add product
		</button>
	);
}
