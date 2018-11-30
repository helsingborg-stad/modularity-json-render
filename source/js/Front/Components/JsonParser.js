import Accordion from './Accordion';
import Table from './Table';
import uuidv1 from 'uuid/v1';
import getApiData from '../../Utilities/getApiData';
import {Pagination} from 'hbg-react';

class JsonParser extends React.Component {
    constructor() {
        super();
        this.state = {
            error: null,
            isLoaded: false,
            items: [],
            itemValues: [],
            filteredItems: [],
            paginatedItems: [],
            totalPages: 0,
            currentPage: 1
        };
    }

    componentDidMount() {
        this.getData();
    }

    getData() {
        const {url, perPage, showPagination} = this.props;
        getApiData(url)
            .then(
                ({result}) => {
                    const data = this.mapData(result);
                    if (!data || Object.keys(data).length === 0) {
                        this.setState({
                            error: Error('Could not fetch data from URL.'),
                            isLoaded: true
                        });
                        return;
                    }
                    this.setState({
                            isLoaded: true,
                            items: data,
                            filteredItems: data,
                            paginatedItems: data,
                            totalPages: Math.ceil(data.length / perPage)
                        },
                        () => {
                            if (showPagination) {
                                this.updateItemList();
                            }
                        });
                }, ({error}) => {
                    this.setState({isLoaded: true, error});
                }
            );
    }

    mapData(jsonData) {
        const {fieldMap} = this.props;
        // Get the object containing items from JSON
        let items = this.getObjectProp(jsonData, fieldMap.itemContainer ? fieldMap.itemContainer.split('.') : []);
        if (!items || Object.keys(items).length === 0) {
            return;
        }
        // Map the data items
        items = items.map(item => ({
            id: uuidv1(),
            heading: fieldMap.heading.map(heading => (
                this.getObjectProp(item, heading.item.value.split('.'))
            )),
            content: fieldMap.content.map(content => ({
                title: content.heading,
                value: this.getObjectProp(item, content.item.value.split('.'))
            })),
        }));

        // Create another array with the field values in a flat list to make search easier
        let itemValues = items.map(item => {
            let obj = {};
            obj.id = item.id;
            obj.values = Object.values(item.heading);
            item.content.forEach(function (section) {
                obj.values.push(section.value);
            });
            return obj;
        });

        this.setState({
            itemValues
        });

        return items;
    }

    getObjectProp(obj, keys) {
        if (keys.length === 0) {
            return obj;
        }

        for (let i = 0; i < keys.length; i++) {
            if (obj.hasOwnProperty(keys[i])) {
                obj = obj[keys[i]];
            } else {
                console.log('Invalid map key');
                return null;
            }
        }

        return obj;
    }

    handleSearch(e) {
        let searchString = typeof(e.target.value === 'string') ? e.target.value.toLowerCase() : e.target.value;
        const {itemValues, items} = this.state;
        const {perPage, showPagination} = this.props;

        let filteredItems = itemValues.filter(item => {
            let isFound = false;
            item.values.forEach((val) => {
                val = String(val).toLowerCase();
                if (val.indexOf(searchString) !== -1) {
                    isFound = true;
                    return;
                }
            });
            return isFound;
        }).map(item => {
            return items.find(obj => obj.id === item.id);
        });

        if (showPagination) {
            this.setState({
                    filteredItems,
                    currentPage: 1,
                    totalPages: Math.ceil(filteredItems.length / perPage)
                },
                () => this.updateItemList()
            );
        } else {
            this.setState({
                filteredItems,
                paginatedItems: filteredItems
            });
        }
    }

    updateItemList() {
        const {filteredItems, currentPage} = this.state;
        const {perPage} = this.props;
        const begin = ((currentPage - 1) * perPage);
        const end = begin + perPage;

        this.setState({
            paginatedItems: filteredItems.slice(begin, end)
        });
    }

    nextPage() {
        if (this.state.currentPage === this.state.totalPages) {
            return;
        }
        const currentPage = this.state.currentPage += 1;
        this.setState({currentPage: currentPage}, () => this.updateItemList());
    }

    prevPage() {
        if (this.state.currentPage <= 1) {
            return;
        }
        const currentPage = this.state.currentPage -= 1;
        this.setState({currentPage: currentPage}, () => this.updateItemList());
    }

    paginationInput(e) {
        let currentPage = e.target.value ? parseInt(e.target.value) : '';
        currentPage = (currentPage > this.state.totalPages) ? this.state.totalPages : currentPage;
        this.setState(
            {currentPage: currentPage},
            () => {
                if (currentPage) {
                    this.updateItemList();
                }
            }
        );
    }

    render() {
        const {showSearch, translation, view, fieldMap} = this.props;
        const {error, isLoaded, paginatedItems, totalPages, currentPage} = this.state;

        if (error) {
            return (
                <div className="gutter">
                    <div className="notice warning">
                        <i className="pricon pricon-notice-warning"></i> {translation.somethingWentWrong}
                    </div>
                </div>
            );
        } else if (!isLoaded) {
            return (
                <div className="gutter">
                    <div className="loading">
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                    </div>
                </div>
            );
        } else {
            return (
                <div>
                    {(view === 'accordion' || view === 'accordiontable') &&
                    <Accordion
                        showSearch={showSearch}
                        doSearch={this.handleSearch.bind(this)}
                        items={paginatedItems}
                        translation={translation}
                        view={view}
                        fieldMap={fieldMap}
                    />
                    }

                    {view === 'table' &&
                    <Table
                        showSearch={showSearch}
                        doSearch={this.handleSearch.bind(this)}
                        items={paginatedItems}
                        translation={translation}
                        view={view}
                        fieldMap={fieldMap}
                    />
                    }

                    {this.props.showPagination &&
                    <div className="grid gutter">
                        <div className="grid-fit-content u-ml-auto">
                            <Pagination
                                current={currentPage}
                                total={totalPages}
                                next={this.nextPage.bind(this)}
                                prev={this.prevPage.bind(this)}
                                input={this.paginationInput.bind(this)}
                            />
                        </div>
                    </div>
                    }
                </div>
            );
        }
    }
}

export default JsonParser;