<?php

namespace ModularityJsonRender\Module\Admin;

class Hooks
{
    public function __construct(private string $slug)
    {
        add_action('save_post', [$this, 'saveOptions'], 10, 3);
        add_action('admin_notices', [$this, 'validationNotice']);
        add_filter('post_updated_messages', [$this, 'updateNotices']);
    }

    public function updateNotices($messages)
    {
        if (!empty(get_transient('mod_json_render_error'))) {
            $messages = [];
        }

        return $messages;
    }


    public function validationNotice()
    {
        if (!($errors = get_transient('mod_json_render_error'))) {
            return;
        }

        // Clear and the transient
        delete_transient('mod_json_render_error');

        foreach ($errors as $error) {
            $class = 'notice notice-error is-dismissible';
            printf('<div class="%1$s"><p>%2$s</p></div>', esc_attr($class), esc_html($error['message']));
        }
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
                remove_action('save_post', [$this, 'saveOptions']);
                wp_update_post(['ID' => $postId, 'post_status' => 'draft']);
                add_action('save_post', [$this, 'saveOptions']);
            }
        }
    }

    public function addSettingsError()
    {
        add_settings_error(
            'missing-settings-fields',
            'missing-settings-fields',
            __('Complete the data settings.', 'modularity-json-render'),
            'error',
        );

        set_transient('mod_json_render_error', get_settings_errors(), 30);
    }
}