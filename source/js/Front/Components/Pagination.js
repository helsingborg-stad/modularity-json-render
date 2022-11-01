import PropTypes from "prop-types";
import React, {Component} from "react";
import Button from "./Button";

class Pagination extends Component {

    static propTypes = {
        current: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        total: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        next: PropTypes.func.isRequired,
        prev: PropTypes.func.isRequired,
        input: PropTypes.func.isRequired,
        langPrev: PropTypes.string,
        langNext: PropTypes.string
    };

    render() {
        const {
            current,
            total,
            next,
            prev,
            input,
            langPrev,
            langNext,
            style
        } = this.props;

        return (
            <div className="c-card__footer">
                <div className="o-grid">

                    <div className="o-grid-5">
                        <Button
                            onClick={prev}
                            disabled={current === 1}
                            class="c-button--md c-button--lg@sm c-button--lg@xs "
                        >
                            <span className="c-icon material-icons">navigate_before</span>{" "}
                            {langPrev ? (
                                <span className="u-display--none@xs u-display--none@sm">
                                        {langPrev}
                                    </span>
                            ) : null}
                        </Button>
                    </div>

                    <div className="o-grid-2 modularity-json-render__pages">
                        <span class="c-typography c-typography__variant--h3">{current} / {total}</span>
                    </div>

                    <div className="o-grid-5">
                        <div class=" u-float--right">
                            <Button
                                onClick={next}
                                disabled={current === total}
                                className="c-button c-button__filled c-button__filled--default c-button--md ripple ripple--before"
                            >
                                {langNext ? (
                                    <span className="u-display--none@xs u-display--none@sm">
                                            {langNext}
                                        </span>
                                ) : null}{" "}
                                <span className="u-hidden@xl c-icon material-icons">navigate_next</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Pagination;