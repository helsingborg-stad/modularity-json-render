import Accordion from './Accordion';
import uuidv1 from 'uuid/v1';
import getApiData from '../../Utilities/getApiData';

class JsonParser extends React.Component {
    constructor() {
        super();
        this.state = {
            error: null,
            isLoaded: false,
            items: [],
            filteredItems: []
        };

        this.handleSearch = this.handleSearch.bind(this);
        this.getObjectProp = this.getObjectProp.bind(this);
    }

    componentDidMount() {
        this.getData();
    }

    getData() {
        const {url} = this.props;
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
                        filteredItems: data
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

    handleSearch(event) {
        let searchString = event.target.value;

        let filteredItems = this.state.items;
        filteredItems = filteredItems.filter((item) => {
            let title = item.title.toLowerCase();
            let content = item.content.toLowerCase();
            return title.indexOf(searchString.toLowerCase()) !== -1 || content.indexOf(searchString.toLowerCase()) !== -1;
        });
        this.setState({
            filteredItems
        });
    }

    render() {
        const {error, isLoaded, filteredItems} = this.state;

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
            return <Accordion doSearch={this.handleSearch}
                              items={filteredItems}/>;
        }
    }
}

export default JsonParser;