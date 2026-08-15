import { useParams } from "react-router-dom";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { ObjectListPage } from "./ObjectListPage";

/** Business Admin > Objects record list: reuses ObjectListPage with BA entry context. */
export function BusinessAdminObjectListPage() {
  const { objectName } = useParams();
  if (!objectName) {
    return null;
  }
  return (
    <AdminPageShell>
      <ObjectListPage
        key={objectName}
        entry="business_admin"
        objectApiName={objectName}
        listChrome="admin"
      />
    </AdminPageShell>
  );
}
