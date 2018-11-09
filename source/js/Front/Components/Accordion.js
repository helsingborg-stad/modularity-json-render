export default class Accordion extends React.Component {
    render() {
        return (
            <div className="accordion accordion-icon accordion-list">
                {this.props.items.map(item => (
                    <section className="accordion-section" key={item.id}>
                        <label tabIndex="0" className="accordion-toggle" htmlFor="accordion-section-1">
                            {item.title}
                        </label>
                        <div className="accordion-content">
                            {item.content}
                        </div>
                    </section>
                ))}
            </div>
        );
    }
}