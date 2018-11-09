import Accordion from './Accordion';
import uuidv1 from 'uuid/v1';

class JsonParser extends React.Component {
    constructor() {
        super();
        this.state = {
            error: null,
            isLoaded: false,
            items: [],
        };
    }

    componentDidMount() {
        this.getApiData();
    }

    mapData(jsonData) {
        const fieldMap = this.props.fieldMap;
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

    getApiData() {
        fetch(this.props.url)
            .then(res => res.json())
            .then(
                (result) => {
                    const data = this.mapData(result);
                    if (!data || Object.keys(data).length === 0) {
                        this.setState({
                            error: {message: 'Empty data'},
                            isLoaded: true
                        });
                        return;
                    }

                    this.setState({
                        isLoaded: true,
                        items: data
                    });
                },
                (error) => {
                    this.setState({
                        isLoaded: true,
                        error
                    });
                }
            );
    }

    render() {
        const {error, isLoaded, items} = this.state;
        if (error) {
            return <div>Error: {error.message}</div>;
        } else if (!isLoaded) {
            return <div>Loading...</div>;
        } else {
            return (
                <Accordion items={items}/>
            );
        }
    }
}

export default JsonParser;