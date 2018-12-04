import SearchField from "./SearchField";

const List = ({items, showSearch, doSearch, translation}) =>
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
        <div className="grid">
            <div className="grid-xs-12">
                <ul className="c-list">
                    {items.map(item => (
                        <li key={item.id} className="c-list__item">
                            {item.heading[0]}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        }
    </div>;

export default List;