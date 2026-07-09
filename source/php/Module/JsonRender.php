<?php

namespace ModularityJsonRender\Module;

use ModularityJsonRender\Module\Admin\Hooks;

class JsonRender extends \Modularity\Module
{
    public $slug = 'json-render';
    public $supports = [];
    public $isBlockCompatible = false;

    public function init()
    {
        //Define module
        $this->nameSingular = __('Json Render', 'modularity-json-render');
        $this->namePlural = __('Json Renders', 'modularity-json-render');
        $this->description = __('Retrives data from API and renders it as a list.', 'modularity-json-render');

        new Hooks($this->slug);
    }

    public function data(): array
    {
        $options = $this->getOptions($this->ID);

        $data = get_fields($this->ID);
        echo '<pre>' . print_r( $this->ID, true ) . '</pre>';die;
        $data['url'] = $options['url'];
        $data['view'] = $options['view'];
        $data['fieldMap'] = $options['fieldMap'];
        $data['classes'] = implode(' ', apply_filters('Modularity/Module/Classes', ['box', 'box-panel'], $this->post_type, $this->args));

        return $data;
    }

    public function template(): string
    {
        return 'list.blade.php';
    }

    public function script()
    {
        // Enqueue React
        class_exists('\Modularity\Helper\React') ? \Modularity\Helper\React::enqueue() : \ModularityJsonRender\Helper\React::enqueue();

        $this->wpEnqueue
            ?->add('js/empty.js')
            ->with()
            ->translation('modJsonRender', [
                'translation' => [
                    'somethingWentWrong' => __('Something went wrong, please try again later.', 'modularity-json-render'),
                    'noResults' => __('No results found.', 'modularity-json-render'),
                    'filterOn' => __('Filter on...', 'modularity-json-render'),
                    'next' => __('Next', 'modularity-json-render'),
                    'prev' => __('Previous', 'modularity-json-render'),
                    'search' => __('Search', 'modularity-json-render'),
                    'searchInputAriaLabel' => __('Filter list', 'modularity-json-render'),
                ],
            ]);
    }

    public function style()
    {
    }

    public function adminEnqueue()
    {
        global $post;
        if (!isset($post->post_type) || $post->post_type !== 'mod-' . $this->slug) {
            return;
        }

        // Enqueue React
        class_exists('\Modularity\Helper\React') ? \Modularity\Helper\React::enqueue() : \ModularityJsonRender\Helper\React::enqueue();

        $options = $this->getOptions($post->ID);

        $this->wpEnqueue
            ?->add('js/empty.js')
            ->with()
            ->translation('modJsonRender', [
                'options' => $options,
                'translation' => [
                    'resetSettings' => __('Reset settings', 'modularity-json-render'),
                    'validJsonUrl' => __('Enter a valid JSON api url.', 'modularity-json-render'),
                    'sendRequest' => __('Send request', 'modularity-json-render'),
                    'selectItemsContainer' => __('Select where to retrieve the information', 'modularity-json-render'),
                    'infoFields' => __('Information fields', 'modularity-json-render'),
                    'title' => __('Title', 'modularity-json-render'),
                    'heading' => __('Heading', 'modularity-json-render'),
                    'headings' => __('Headings', 'modularity-json-render'),
                    'content' => __('Content', 'modularity-json-render'),
                    'select' => __('Select', 'modularity-json-render'),
                    'couldNotFetch' => __('Could not fetch data from URL.', 'modularity-json-render'),
                    'list' => __('List', 'modularity-json-render'),
                    'accordion' => __('Accordion', 'modularity-json-render'),
                    'accordiontable' => __('Accordion table', 'modularity-json-render'),
                    'table' => __('Table', 'modularity-json-render'),
                    'selectView' => __('Select view', 'modularity-json-render'),
                    'dragAndDropInfo' => __('Drag and drop fields into the areas to the right. The areas accept different amount of values depending on selected view.', 'modularity-json-render'),
                    'value' => __('Value', 'modularity-json-render'),
                    'prefix' => __('Prefix', 'modularity-json-render'),
                    'suffix' => __('Suffix', 'modularity-json-render'),
                    'selectDateFormat' => __('Select date format', 'modularity-json-render'),
                    'none' => __('None', 'modularity-json-render'),
                ],
            ])
            ->add('css/modularity-json-render-admin.css');
    }

    public function getOptions($postId)
    {
        $url = get_post_meta($postId, 'json_url', true);
        $view = get_post_meta($postId, 'view', true);
        $fieldmap = get_post_meta($postId, 'fieldmap', true);
        $options = [
            'url' => $url ? $url : null,
            'view' => $view ? $view : null,
            'fieldMap' => $fieldmap ? $fieldmap : null,
        ];

        return $options;
    }

    /**
     * Available "magic" methods for modules:
     * init()            What to do on initialization
     * data()            Use to send data to view (return array)
     * style()           Enqueue style only when module is used on page
     * script            Enqueue script only when module is used on page
     * adminEnqueue()    Enqueue scripts for the module edit/add page in admin
     * template()        Return the view template (blade) the module should use when displayed
     */
}
