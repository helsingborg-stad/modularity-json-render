<?php

namespace ModularityJsonRender\Module;

class JsonRender extends \Modularity\Module
{
    public $slug = 'json-render';
    public $supports = array();
    public $isBlockCompatible = false;

    public function init()
    {
        //Define module
        $this->nameSingular = __("Json Render", 'modularity-json-render');
        $this->namePlural = __("Json Renders", 'modularity-json-render');
        $this->description = __("Retrives data from API and renders it as a list.", 'modularity-json-render');

        add_action('save_post', array($this, 'saveOptions'), 10, 3);
        add_action('admin_notices', array($this, 'validationNotice'));
        add_filter('post_updated_messages', array($this, 'updateNotices'));
    }

    public function validationNotice()
    {
        if (!$errors = get_transient('mod_json_render_error')) {
            return;
        }

        // Clear and the transient
        delete_transient('mod_json_render_error');

        foreach ($errors as $error) {
            $class = 'notice notice-error is-dismissible';
            printf('<div class="%1$s"><p>%2$s</p></div>', esc_attr($class), esc_html($error['message']));
        }
    }

    public function updateNotices($messages)
    {
        if (!empty(get_transient('mod_json_render_error'))) {
            $messages = array();
        }

        return $messages;
    }

    public function saveOptions($postId, $post, $update)
    {
        if ($post->post_type !== 'mod-' . $this->slug) {
            return;
        }

        if (array_key_exists('mod_json_render_url', $_POST) && array_key_exists('mod_json_render_fieldmap', $_POST)) {
            $url = $_POST['mod_json_render_url'];
            $view = $_POST['mod_json_render_view'];
            $fieldMap = json_decode(html_entity_decode(stripslashes($_POST['mod_json_render_fieldmap'])));

            if ($url && $view && isset($fieldMap->heading) && !empty($fieldMap->heading)) {
                update_post_meta($postId, 'json_url', $url);
                update_post_meta($postId, 'view', $view);
                update_post_meta($postId, 'fieldmap', $_POST['mod_json_render_fieldmap']);
            } else {
                $this->addSettingsError();
                remove_action('save_post', array($this, 'saveOptions'));
                wp_update_post(array('ID' => $postId, 'post_status' => 'draft'));
                add_action('save_post', array($this, 'saveOptions'));
            }
        }
    }

    public function addSettingsError()
    {
        add_settings_error(
            'missing-settings-fields',
            'missing-settings-fields',
            __('Complete the data settings.', 'modularity-json-render'),
            'error'
        );

        set_transient('mod_json_render_error', get_settings_errors(), 30);
    }

    public function data(): array
    {
        $options = $this->getOptions($this->ID);

        $data = get_fields($this->ID);
        $data['url'] = $options['url'];
        $data['view'] = $options['view'];
        $data['fieldMap'] = $options['fieldMap'];
        $data['classes'] = implode(' ', apply_filters('Modularity/Module/Classes', array('box', 'box-panel'), $this->post_type, $this->args));

        return $data;
    }

    public function template(): string
    {
        return "list.blade.php";
    }

    public function script()
    {
        // Enqueue React
        class_exists('\Modularity\Helper\React') ? \Modularity\Helper\React::enqueue() : \ModularityJsonRender\Helper\React::enqueue();

        wp_enqueue_script('modularity-' . $this->slug);
        wp_localize_script('modularity-' . $this->slug, 'modJsonRender', array(
            'translation' => array(
                'somethingWentWrong' => __('Something went wrong, please try again later.', 'modularity-json-render'),
                'noResults' => __('No results found.', 'modularity-json-render'),
                'filterOn' => __('Filter on...', 'modularity-json-render'),
                'next' => __('Next', 'modularity-json-render'),
                'prev' => __('Previous', 'modularity-json-render'),
                'search' => __('Search', 'modularity-json-render'),
                'searchInputAriaLabel' => __('Filter list', 'modularity-json-render'),
            )
        ));
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

        wp_enqueue_script('modularity-json-render-admin-js');
        $options = $this->getOptions($post->ID);
        wp_localize_script('modularity-json-render-admin-js', 'modJsonRender', array(
            'options' => $options,
            'translation' => array(
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
            )
        ));

        wp_enqueue_style('modularity-' . $this->slug . '-admin'); // Enqueue styles
    }

    public function getOptions($postId)
    {
        $url = get_post_meta($postId, 'json_url', true);
        $view = get_post_meta($postId, 'view', true);
        $fieldmap = get_post_meta($postId, 'fieldmap', true);
        $options = array(
            'url' => $url ? $url : null,
            'view' => $view ? $view : null,
            'fieldMap' => $fieldmap ? $fieldmap : null
        );

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
