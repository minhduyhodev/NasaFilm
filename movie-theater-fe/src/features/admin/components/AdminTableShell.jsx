
/**
 * Panel wrapper for list/table pages: optional toolbar + scroll body + footer.
 * Does not prescribe column schema — pass table markup as children.
 */
const AdminTableShell = ({ toolbar, footer, children, className = '' }) => (
  <div className={`adm-table-shell${className ? ` ${className}` : ''}`}>
    {toolbar ? <div className="adm-table-shell__toolbar">{toolbar}</div> : null}
    <div className="adm-table-shell__body">
      <div className="overflow-x-auto w-full">
        {children}
      </div>
    </div>
    {footer ? <div className="adm-table-shell__footer">{footer}</div> : null}
  </div>
);

export default AdminTableShell;
