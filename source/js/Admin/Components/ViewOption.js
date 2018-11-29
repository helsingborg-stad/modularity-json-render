const ViewOption = ({view, setView}) =>
<div>
    <h3>View</h3>
    <div className="radio">
        <label>
            <input type="radio" value="accordion"
                   checked={view === 'accordion'}
                   onChange={setView} />
            Accordion
        </label>
    </div>
    <div className="radio">
        <label>
            <input type="radio" value="accordiontable"
                   checked={view === 'accordiontable'}
                   onChange={setView} />
            Accordion table
        </label>
    </div>
    <div className="radio">
        <label>
            <input type="radio" value="table"
                   checked={view === 'table'}
                   onChange={setView} />
            Table
        </label>
    </div>
</div>
;

export default ViewOption;