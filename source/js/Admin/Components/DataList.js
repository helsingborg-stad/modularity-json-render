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
                                  onClickContent={e => this.setFieldMap(data[item], e)}
                                  translation={this.props.translation}/>;

            if (typeof data[item] === 'object' && data[item] !== null) {
                child = React.cloneElement(child, {
                    children: Array.isArray(data[item]) ? this.renderNodes(data[item][0]) : this.renderNodes(data[item])
                });
            }

            return child;
        });
    }

    render() {
        const {translation, data} = this.props;
        const fieldMap = this.props.fieldMap;

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
                    <h3>{translation.selectItemsContainer}</h3>
                    <ul className="json-tree">
                        {this.renderNodes(data)}
                    </ul>
                </div>
            );
        } else {
            let objectData = objectPath.get(data, fieldMap.itemContainer);

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
                    <h3>{translation.selectTitleContent}</h3>
                    <ul className="json-tree">
                        {this.renderNodes(objectData)}
                    </ul>
                </div>
            );
        }
    }
}

export default DataList;