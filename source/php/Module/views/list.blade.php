@card([
    'classList' => explode(' ', $classes),
    'id' => 'mod-json-render-container'
])
    @if (!$hideTitle && !empty($post_title))
        <div class="c-card__header">
            
                @typography([
                    'element' => 'h4'
                ])
                    {!! apply_filters('the_title', $post_title) !!}
                @endtypography
            
        </div>
    @endif

    <div class="modularity-json-render"
         data-url="{{ $url }}"
         data-view="{{ $view }}"
         data-field-map="{{ $fieldMap }}"
         data-show-search="{{ $show_search ? true : false }}"
         data-show-pagination="{{ $show_pagination ? true : false }}"
         data-per-page="{{ $per_page ?? 10 }}">
    </div>

@endcard

@element([
    'componentElement' => 'style'
])
    @@layer theme {
        .modularity-json-render #jsonRenderData {
            display: grid;
            gap: 1px;
            border-radius: unset;
            background-color: var(--color--surface-border, #f5f5f5);
        }

        .modularity-json-render .c-card__body {
            background-color: var(--color--surface, #fff);
        }

        .modularity-json-render .c-accordion__section :is(.c-accordion__button, .c-accordion__content, .c-accordion__button-wrapper) {
            background-color: var(--color--surface, #fff);
            color: var(--color--surface-contrast, #000);
        }

        .modularity-json-render .c-accordion__section.is-active :is(.c-accordion__button, .c-accordion__content, .c-accordion__button-wrapper) {
            background-color: var(--color--surface-alt, #f5f5f5);
        }

        .modularity-json-render .c-accordion__section.is-active .c-accordion__icon {
            transform: rotate(180deg);
        }

        .modularity-json-render .c-accordion__button {
            width: 100%;
            padding: 24px;
            border: none;
            cursor: pointer;
        }

        .modularity-json-render .c-accordion__button-wrapper {
            font-weight: bold;
        }

        .modularity-json-render .c-accordion__content {
            padding: 24px;
        }

        .modularity-mod-json-render .c-accordion__button-wrapper .c-icon::after {
            display: none;
        }

        .modularity-mod-json-render .c-accordion__content {
            display: none;
        }

        .modularity-mod-json-render .c-accordion__section.is-active .c-accordion__content {
            display: block;
        }
    }
@endelement

@element([
    'componentElement' => 'script'
])
    document.addEventListener('DOMContentLoaded', function () {
        function initAccordionSections(section) {
            section.classList.add('is-initialized');
            const button = section.querySelector('.c-accordion__button');
            if (!button) return;
            button.addEventListener('click', function () {
                section.classList.toggle('is-active');
            });
        }

        document.querySelectorAll('.c-accordion__section:not(.is-initialized)').forEach(function (section) {
            initAccordionSections(section);
        });

        function tryGetAccordionSections(node) {
            if (node.classList.contains('c-accordion__section') && !node.classList.contains('is-initialized')) {
                return [node];
            } else {
                return node.querySelectorAll('.c-accordion__section:not(.is-initialized)');
            }
        }

        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType !== Node.ELEMENT_NODE) return;
                    const sections = tryGetAccordionSections(node);

                    sections.forEach(function (section) {
                        initAccordionSections(section);
                    });
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
@endelement