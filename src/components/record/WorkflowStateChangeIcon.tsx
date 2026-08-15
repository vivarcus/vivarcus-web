import veevaWorkflowIcon from "../../assets/icons/veeva-workflow.svg";

type Props = {
  className?: string;
};

/** Veeva Vault "Workflow and State Change" toolbar icon (vault-ui workflow.svg). */
export function WorkflowStateChangeIcon({ className }: Props) {
  return (
    <img
      className={className}
      src={veevaWorkflowIcon}
      width={17}
      height={14}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
