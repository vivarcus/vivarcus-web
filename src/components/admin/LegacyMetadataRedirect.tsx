import { Navigate, useParams } from "react-router-dom";

/** Maps legacy `/admin/configuration/metadata/*` paths to flattened Configuration routes. */
export function LegacyMetadataRedirect() {
  const params = useParams();
  const splat = params["*"] ?? "";
  let rest = splat;
  if (rest === "lifecycles" || rest.startsWith("lifecycles/")) {
    rest = rest.replace(/^lifecycles/, "object-lifecycles");
  } else if (rest === "" || rest === "objects" || rest.startsWith("objects/")) {
    rest = rest === "" ? "objects" : rest;
  }
  // layouts and anything else keep the same trailing path
  return <Navigate to={`/admin/configuration/${rest}`} replace />;
}
