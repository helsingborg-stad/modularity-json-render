<?php

namespace ModularityJsonRender\Module;

class JsonRender extends \Modularity\Module
{
    public $slug = 'json-render';
    public $supports = array();
    public $react = false;

    public function init()
    {
        //Define module
        $this->nameSingular = __("Json Render", 'modularity-json-render');
        $this->namePlural = __("Json Renders", 'modularity-json-render');
        $this->description = __("Retrives data from API and renders it as a list.", 'modularity-json-render');

        //Get helper react
        $this->react = new \ModularityJsonRender\Helper\React();

        add_action('save_post', array($this, 'saveOptions'), 10, 3);
    }

    public function saveOptions($postId, $post, $update)
    {
        if ($post->post_type !== 'mod-' . $this->slug) {
            return;
        }

        if (array_key_exists('mod_json_render_url', $_POST) && array_key_exists('mod_json_render_url', $_POST)) {
            update_post_meta($postId, 'json_url', $_POST['mod_json_render_url']);
            update_post_meta($postId, 'fieldmap', $_POST['mod_json_render_fieldmap']);
        }
    }

    public function data(): array
    {
        $options = $this->getOptions($this->ID);

        $data = get_fields($this->ID);
        $data['url'] = $options['url'];
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
        $this->react::enqueue(); // Enqueue react
        wp_enqueue_script('modularity-' . $this->slug);
        wp_localize_script('modularity-' . $this->slug, 'modJsonRender', array(
            'translation' => array(
                'somethingWentWrong' => __('Something went wrong, please try again later.', 'modularity-json-render'),
                'noResults' => __('No results found.', 'modularity-json-render'),
                'filterOn' => __('Filter on...', 'modularity-json-render')
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

        $this->react::enqueue(); // Enqueue react
        wp_enqueue_script('modularity-json-render-admin-js');
        $options = $this->getOptions($post->ID);
        wp_localize_script('modularity-json-render-admin-js', 'modJsonRender', array(
            'options' => $options,
            'translation' => array(
                'resetSettings' => __('Reset settings', 'modularity-json-render'),
                'validJsonUrl' => __('Enter a valid JSON api url.', 'modularity-json-render'),
                'sendRequest' => __('Send request', 'modularity-json-render'),
                'selectItemsContainer' => __('Select where to retrieve the information', 'modularity-json-render'),
                'selectTitleContent' => __('Select title and content fields', 'modularity-json-render'),
                'title' => __('Title', 'modularity-json-render'),
                'content' => __('Content', 'modularity-json-render'),
                'select' => __('Select', 'modularity-json-render'),
                'couldNotFetch' => __('Could not fetch data from URL.', 'modularity-json-render'),
            )
        ));

        wp_enqueue_style('modularity-' . $this->slug . '-admin'); // Enqueue styles
    }

    public function getOptions($postId)
    {
        $url = get_post_meta($postId, 'json_url', true);
        $fieldmap = get_post_meta($postId, 'fieldmap', true);
        $options = array(
            'url' => $url ? $url : null,
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
