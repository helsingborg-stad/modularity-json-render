import SearchField from './SearchField';

const Table = ({items, showSearch, doSearch, translation, view, fieldMap}) =>
    <div>
        {showSearch &&
        <SearchField
            doSearch={doSearch}
            translation={translation}
        />
        }

        {Object.keys(items).length === 0 &&
        <div className="gutter"><p>{translation.noResults}</p></div>
        }

        {Object.keys(items).length > 0 &&
        <table className="table table-striped">
            <thead>
            <tr>
                {fieldMap.heading.map((heading, i) => (
                    <th key={i}>
                        {heading.heading}
                    </th>
                ))}
            </tr>
            </thead>
            <tbody>
            {items.map(item => (
                <tr key={item.id}>
                    {item.heading.map((heading, i) => (
                        <td key={i}>{heading}</td>
                    ))}
                </tr>
            ))}
            </tbody>
        </table>
        }
    </div>;

export default Table;