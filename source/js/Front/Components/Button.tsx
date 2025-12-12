import PropTypes from 'prop-types';
import React, { Component } from 'react';

class Button extends Component {
	static propTypes = {
		size: PropTypes.oneOf(['large', 'small']),
		block: PropTypes.bool,
		disabled: PropTypes.bool,
		outline: PropTypes.bool,
		href: PropTypes.string,
		onClick: PropTypes.func,
		submit: PropTypes.bool,
		title: PropTypes.string,
	};

	render() {
		const props = this.props;
		const dynamicProps = {};

		dynamicProps.className = 'c-button';

		//Size
		if (typeof props.size != 'undefined') {
			dynamicProps.className += props.size == 'large' ? ' c-button--lg' : '';
			dynamicProps.className += props.size == 'small' ? ' c-button--md' : '';
		} else {
			dynamicProps.className += ' c-button--md';
		}

		//Block
		if (typeof props.block) {
			dynamicProps.className += ' c-button__filled c-button__filled--primary';
		}

		//Disabled
		if (typeof props.disabled != 'undefined' && props.disabled) {
			dynamicProps.disabled += props.disabled ? 'true' : 'false';
		}

		//Outline
		if (typeof props.outline != 'undefined' && props.outline) {
			dynamicProps.className += ' c-button__outlined c-button__outlined--primary';
		}

		if (typeof props.href != 'undefined') {
			dynamicProps.href = props.href;
			return <a {...dynamicProps}>{props.children || props.title}</a>;
		} else if (typeof props.onClick != 'undefined') {
			dynamicProps.onClick = props.onClick;
			return <button {...dynamicProps}>{props.children || props.title}</button>;
		} else if (typeof props.submit != 'undefined' && props.submit) {
			dynamicProps.type = 'submit';
			dynamicProps.value = props.title;
			return <input {...dynamicProps} />;
		}

		return null;
	}
}

export default Button;
