import ListItem from './ListItem';
import recursiveIterator from 'recursive-iterator';
import objectPath from 'object-path';

class DataList extends React.Component {
    setFieldMap(path, event) {
        event.preventDefault();
        this.props.updateFieldMap({[event.target.dataset.field]: path});
    }

    renderNodes(data) {
        return Object.keys(data).map(item => {
            if (item === 'objectPath') {
                return;
            }

            let child = <ListItem key={item.toString()}
                                  value={item}
                                  object={data[item]}
                                  fieldMap={this.props.fieldMap}
                                  onClickContainer={e => this.setFieldMap(data[item].objectPath, e)}
                                  onClickTitle={e => this.setFieldMap(data[item], e)}
                                  onClickContent={e => this.setFieldMap(data[item], e)}/>;

            if (typeof data[item] === 'object' && data[item] !== null) {
                child = React.cloneElement(child, {
                    children: Array.isArray(data[item]) ? this.renderNodes(data[item][0]) : this.renderNodes(data[item])
                });
            }

            return child;
        });
    }

    render() {
        const fieldMap = this.props.fieldMap;

        let data = this.props.data;
        if (Array.isArray(data)) {
            fieldMap.itemContainer = '';
        }

        if (fieldMap.itemContainer === null) {
            if (Array.isArray(data)) {
                data = data[0];
            }

            for (let {parent, node, key, path} of new recursiveIterator(data)) {
                if (typeof node === 'object' && node !== null) {
                    let pathString = path.join('.');
                    objectPath.set(data, pathString + '.objectPath', pathString);
                }
            }

            return (
                <div>
                    <h3>Select items container</h3>
                    <ul className="json-tree">{this.renderNodes(data)}</ul>
                </div>
            );
        } else {
            let objectData = objectPath.get(this.props.data, fieldMap.itemContainer);

            if (Array.isArray(objectData)) {
                objectData = objectData[0];
            }

            for (let {parent, node, key, path} of new recursiveIterator(objectData)) {
                if (typeof node !== 'object') {
                    let pathString = path.join('.');
                    objectPath.set(objectData, pathString, pathString);
                }
            }

            return (
                <div>
                    <h3>Select title and content fields</h3>
                    <ul className="json-tree">{this.renderNodes(objectData)}</ul>
                </div>
            );
        }
    }
}

export default DataList;