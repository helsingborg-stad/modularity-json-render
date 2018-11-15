import Accordion from './Accordion';
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
                    });

                    if (showPagination) {
                        this.updateItemList(1);
                    }
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
            title: this.getObjectProp(item, fieldMap.title.split('.')),
            content: this.getObjectProp(item, fieldMap.content.split('.'))
        }));
        // Remove objects with missing fields
        items = items.filter(function (item) {
            return item.id && item.title && item.content;
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
        let searchString = e.target.value;
        let filteredItems = this.state.items;
        const {perPage, showPagination} = this.props;

        filteredItems = filteredItems.filter((item) => {
            let title = item.title.toLowerCase();
            let content = item.content.toLowerCase();
            return title.indexOf(searchString.toLowerCase()) !== -1 || content.indexOf(searchString.toLowerCase()) !== -1;
        });

        if (showPagination) {
            this.setState({
                filteredItems,
                currentPage: 1,
                totalPages: Math.ceil(filteredItems.length / perPage)
            });
            this.updateItemList(1);
        } else {
            this.setState({
                filteredItems,
                paginatedItems: filteredItems
            });
        }
    }

    updateItemList(currentPage) {
        const {filteredItems} = this.state;
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
        this.setState({currentPage: currentPage});
        this.updateItemList(currentPage);
    }

    prevPage() {
        if (this.state.currentPage <= 1) {
            return;
        }
        const currentPage = this.state.currentPage -= 1;
        this.setState({currentPage: currentPage});
        this.updateItemList(currentPage);
    }

    paginationInput(e) {
        let currentPage = e.target.value ? parseInt(e.target.value) : '';
        currentPage = (currentPage > this.state.totalPages) ? this.state.totalPages : currentPage;
        this.setState({currentPage: currentPage});
        if (currentPage) {
            this.updateItemList(currentPage);
        }
    }

    render() {
        const {error, isLoaded, paginatedItems, totalPages, currentPage} = this.state;

        if (error) {
            return (
                <div className="gutter">
                    <div className="notice warning">
                        <i className="pricon pricon-notice-warning"></i> Something went wrong. Please try again later.
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
                    <Accordion
                        showSearch={this.props.showSearch}
                        doSearch={this.handleSearch.bind(this)}
                        items={paginatedItems}/>
                    {this.props.showPagination ?
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
                        </div> : ''}
                </div>
            );
        }
    }
}

export default JsonParser;