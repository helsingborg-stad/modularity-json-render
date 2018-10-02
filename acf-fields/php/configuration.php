<?php 

if (function_exists('acf_add_local_field_group')) {
    acf_add_local_field_group(array(
    'key' => 'group_5bb1ccff7600b',
    'title' => __('JSON API Settings', 'modularity-json-render'),
    'fields' => array(
        0 => array(
            'key' => 'field_5bb1cd1c313ec',
            'label' => __('Data source', 'modularity-json-render'),
            'name' => 'mod_json_data_source',
            'type' => 'url',
            'instructions' => __('Enter a valid JSON api url. The json data provided from the source should be as flat as possible.', 'modularity-json-render'),
            'required' => 0,
            'conditional_logic' => 0,
            'wrapper' => array(
                'width' => '',
                'class' => '',
                'id' => '',
            ),
            'default_value' => '',
            'placeholder' => '',
        ),
        1 => array(
            'key' => 'field_5bb1cf28c13c5',
            'label' => __('List data field', 'modularity-json-render'),
            'name' => 'mod_json_list_data_field',
            'type' => 'select',
            'instructions' => '',
            'required' => 0,
            'conditional_logic' => 0,
            'wrapper' => array(
                'width' => '',
                'class' => '',
                'id' => '',
            ),
            'choices' => array(
            ),
            'default_value' => array(
            ),
            'allow_null' => 0,
            'multiple' => 0,
            'ui' => 0,
            'ajax' => 0,
            'return_format' => 'value',
            'placeholder' => '',
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