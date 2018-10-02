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
    }

    public function data() : array
    {
        return array(
            'moduleId' => $this->ID,
            'jsonUrl' => get_field('mod_json_data_source', $this->ID)
        );
    }

    public function template() : string
    {
        return "list.blade.php";
    }

    public function script()
    {
        $this->react::enqueue(); // Enqueue react
        wp_enqueue_script('modularity-' . $this->slug); // Enqueue script
    }

    public function style()
    {
        wp_enqueue_style('modularity-' . $this->slug); // Enqueue styles
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
