import Accordion from './Accordion';
import Table from './Table';
import List from './List';
import uuidv1 from 'uuid/v1';
import getApiData from '../../Utilities/getApiData';
import {isDate, getDate, getDateTime} from '../../Utilities/date';
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
        items = items.map(item => (
            {
                id: uuidv1(),
                heading: fieldMap.heading.map(heading => {
                    let value = this.getObjectProp(item, heading.item.value.split('.'));
                    value = (!value || value === 'null') ? '' : value;
                    value = (value && heading.prefix) ? value : this.autoLink(value);
                    value = (value && isDate(value) && heading.dateFormat === 'Y-m-d') ? getDate(value) : value;
                    value = (value && isDate(value) && heading.dateFormat === 'Y-m-d H:i') ? getDateTime(value) : value;
                    return (heading.prefix ? heading.prefix : '') + value + (heading.suffix ? heading.suffix : '');
                }),
                content: fieldMap.content.map(content => {
                    let value = this.getObjectProp(item, content.item.value.split('.'));
                    value = (!value || value === 'null') ? '' : value;
                    value = (value && content.prefix) ? value : this.autoLink(value);
                    value = (value && isDate(value) && content.dateFormat === 'Y-m-d') ? getDate(value) : value;
                    value = (value && isDate(value) && content.dateFormat === 'Y-m-d H:i') ? getDateTime(value) : value;
                    return {
                        title: content.heading,
                        value: (content.prefix ? content.prefix : '') + value + (content.suffix ? content.suffix : '')
                    };
                }),
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

    autoLink(string) {
        if (typeof string !== 'string' || !string) {
            return string;
        }
        const regex = /(?![^<]*>|[^<>]*<\/)((https?:)\/\/[a-z0-9&#=.\/\-?_]+)/gi;
        const subst = '<a href="$1">$1</a>';

        return string.replace(regex, subst);
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

    switchView(view) {
        const props = {
            showSearch: this.props.showSearch,
            doSearch: this.handleSearch.bind(this),
            items: this.state.paginatedItems,
            translation: this.props.translation,
            view: view,
            fieldMap: this.props.fieldMap
        };

        switch (view) {
            case 'accordion':
                return <Accordion {...props} />;
            case 'accordiontable':
                return <Accordion {...props} />;
            case 'table':
                return <Table {...props} />;
            default:
                return <List {...props} />;
        }
    }

    render() {
        const {translation, view} = this.props;
        const {error, isLoaded, totalPages, currentPage} = this.state;

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
                    {this.switchView(view)}
                    {this.props.showPagination &&
                    <div className="grid gutter">
                        <div className="grid-fit-content u-ml-auto">
                            <Pagination
                                current={currentPage}
                                total={totalPages}
                                next={this.nextPage.bind(this)}
                                prev={this.prevPage.bind(this)}
                                input={this.paginationInput.bind(this)}
                                langPrev={translation.prev}
                                langNext={translation.next}
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