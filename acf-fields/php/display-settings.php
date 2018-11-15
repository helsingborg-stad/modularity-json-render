<?php 

if (function_exists('acf_add_local_field_group')) {
    acf_add_local_field_group(array(
    'key' => 'group_5bed3c2a60bb7',
    'title' => __('Display settings', 'modularity-json-render'),
    'fields' => array(
        0 => array(
            'key' => 'field_5bed3c4f10bdc',
            'label' => __('Show search', 'modularity-json-render'),
            'name' => 'show_search',
            'type' => 'true_false',
            'instructions' => '',
            'required' => 0,
            'conditional_logic' => 0,
            'wrapper' => array(
                'width' => '33',
                'class' => '',
                'id' => '',
            ),
            'message' => '',
            'default_value' => 1,
            'ui' => 1,
            'ui_on_text' => __('Yes', 'modularity-json-render'),
            'ui_off_text' => __('No', 'modularity-json-render'),
        ),
        1 => array(
            'key' => 'field_5bed3d074b18c',
            'label' => __('Show pagination', 'modularity-json-render'),
            'name' => 'show_pagination',
            'type' => 'true_false',
            'instructions' => '',
            'required' => 0,
            'conditional_logic' => 0,
            'wrapper' => array(
                'width' => '33',
                'class' => '',
                'id' => '',
            ),
            'message' => '',
            'default_value' => 1,
            'ui' => 1,
            'ui_on_text' => __('Yes', 'modularity-json-render'),
            'ui_off_text' => __('No', 'modularity-json-render'),
        ),
        2 => array(
            'key' => 'field_5bed3d473041a',
            'label' => __('Per page', 'modularity-json-render'),
            'name' => 'per_page',
            'type' => 'number',
            'instructions' => '',
            'required' => 1,
            'conditional_logic' => array(
                0 => array(
                    0 => array(
                        'field' => 'field_5bed3d074b18c',
                        'operator' => '==',
                        'value' => '1',
                    ),
                ),
            ),
            'wrapper' => array(
                'width' => '33',
                'class' => '',
                'id' => '',
            ),
            'default_value' => 10,
            'placeholder' => '',
            'prepend' => '',
            'append' => '',
            'min' => 1,
            'max' => 999,
            'step' => '',
        ),
    ),
    'location' => array(
        0 => array(
            0 => array(
                'param' => 'post_type',
                'operator' => '==',
                'value' => 'mod-json-render',
            ),
        ),
    ),
    'menu_order' => 0,
    'position' => 'normal',
    'style' => 'default',
    'label_placement' => 'top',
    'instruction_placement' => 'label',
    'hide_on_screen' => '',
    'active' => 1,
    'description' => '',
));
}