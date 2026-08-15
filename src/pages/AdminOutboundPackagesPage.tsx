import { AdminPageShell } from "../components/admin/AdminPageShell";
import { ObjectListPage } from "./ObjectListPage";

/** Admin > Deployment > Outbound Packages: object list shell for outbound_package__v. */
export function AdminOutboundPackagesPage() {
  return (
    <AdminPageShell>
      <ObjectListPage
        entry="business_admin"
        objectApiName="outbound_package__v"
        listChrome="admin"
      />
    </AdminPageShell>
  );
}
