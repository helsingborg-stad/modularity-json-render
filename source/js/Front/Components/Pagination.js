import PropTypes from "prop-types";
import React, { Component } from "react";
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
            langNext
        } = this.props;

        return (
            <div className="grid u-margin__top--2">
                <div className="grid-fit-content">
                    <div className="grid sm-gutter">
                        <div className="grid-fit-content">
                            <Button
                                onClick={prev}
                                disabled={current === 1}
                            >
                                <i className="pricon pricon-previous u-hidden@md u-hidden@lg u-hidden@xl" />{" "}
                                {langPrev ? (
                                    <span className="u-hidden@xs u-hidden@sm">
                                        {langPrev}
                                    </span>
                                ) : null}
                            </Button>
                        </div>

                        <div className="grid-fit-content">
                            <span class="c-typography c-typography__variant--h3">{current} / {total}</span>
                        </div>

                        <div className="grid-fit-content">
                            <Button
                                onClick={next}
                                disabled={current === total}
                            >
                                {langNext ? (
                                    <span className="u-hidden@xs u-hidden@sm">
                                        {langNext}
                                    </span>
                                ) : null}{" "}
                                <i className="pricon pricon-next u-hidden@md u-hidden@lg u-hidden@xl" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Pagination;