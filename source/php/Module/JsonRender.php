<?php

namespace ModularityJsonRender\Module;

class JsonRender extends \Modularity\Module
{
    public $slug = 'json-render';
    public $supports = array();

    public function init()
    {
        $this->nameSingular = __("Json Render", 'modularity-json-render');
        $this->namePlural = __("Json Renders", 'modularity-json-render');
        $this->description = __("REtrives data from API and renders it as a list.", 'modularity-json-render');
    }

    public function data() : array
    {
        return array();
    }

    public function template() : string
    {
        return "list.blade.php";
    }

    public function script()
    {
        wp_enqueue_script($this->slug . '-js');
    }

    public function style()
    {
        wp_enqueue_style($this->slug . '-css');
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
