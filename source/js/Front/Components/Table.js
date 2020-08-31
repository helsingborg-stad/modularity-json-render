import SearchField from './SearchField';

const Table = ({items, showSearch, doSearch, translation, view, fieldMap}) =>
    <div class="c-table table-striped table-bordered">
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
        <table class="c-table__table">
            <thead class="c-table__head">
            <tr class="c-table__line">
                {fieldMap.heading.map((heading, i) => (
                    <th class="c-table__column" key={i}>
                        {heading.heading}
                    </th>
                ))}
            </tr>
            </thead>

            <tbody class="c-table__body">
            {items.map(item => (
                <tr class="c-table__line" key={item.id}>
                    {item.heading.map((heading, i) => (
                        <td class="c-table__column" key={i} dangerouslySetInnerHTML={{__html: heading}} />
                    ))}
                </tr>
            ))}
            </tbody>
        </table>
        }
    </div>;

export default Table;