const ViewOption = ({view, setView, translation}) =>
<div>
    <h3>{translation.selectView}</h3>
    <div className="radio">
        <label>
            <input type="radio" value="list"
                   checked={view === 'list'}
                   onChange={setView} />
            {translation.list}
        </label>
    </div>
    <div className="radio">
        <label>
            <input type="radio" value="accordion"
                   checked={view === 'accordion'}
                   onChange={setView} />
            {translation.accordion}
        </label>
    </div>
    <div className="radio">
        <label>
            <input type="radio" value="accordiontable"
                   checked={view === 'accordiontable'}
                   onChange={setView} />
            {translation.accordiontable}
        </label>
    </div>
    <div className="radio">
        <label>
            <input type="radio" value="table"
                   checked={view === 'table'}
                   onChange={setView} />
            {translation.table}
        </label>
    </div>
</div>
;

export default ViewOption;