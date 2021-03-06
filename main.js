// file moj_panel/main.js
// Edited by: Michał Bednarczyk
// Copyright (C) 2017 .....
//
//  Distributed under the terms of the BSD License.
// ---------------------------------------------------------------------------
//Przyklad zaladowania panelu bocznego
//przyklad podlinkowania stylu CSS
//przykład tworzenia linków do dokumentów Jupytera
//TODO: zrobic ladowanie danych konfiguracyjnych z uzyciem 'config'
//TODO: zrobic ladowanie stylu
//TODO: zrobic panel z filemanagerem
//TODO: spr. oprzeć panel na właściwościach jquery, może wyjść prostszy w implementacji

define([
    'require',
    'jqueryui',
    'base/js/namespace',
    'base/js/events',
    'base/js/utils',
    'services/config'
], function (
    require,
    $,
    IPython, //albo Jupyter - to chyba to samo, albo zazebiaja sie przestrzenie nazw
    events,
    utils,
    configmod
) {
    'use strict';
// create config object to load parameters
 //   var base_url = utils.get_body_data('baseUrl');
 //   var config = new configmod.ConfigSection('notebook', {base_url: base_url});

//****
    var side_panel_min_rel_width = 10;
    var side_panel_max_rel_width = 90;
    var side_panel_start_width = 15;

    var build_side_panel = function (main_panel, side_panel, min_rel_width, max_rel_width) {
        if (min_rel_width === undefined) min_rel_width = 0;
        if (max_rel_width === undefined) max_rel_width = 100;

        side_panel.css('display','none');

        //W tym miejscu decyduje się czy panel będzie z lewej czy z prawej - jest jeszcze parę takich miejsc i należy odwrócic animację
        side_panel.insertAfter(main_panel);

        var side_panel_splitbar = $('<div class="side_panel_splitbar"/>');
        var side_panel_inner = $('<div class="side_panel_inner"/>');
        var side_panel_expand_contract = $('<i class="btn fa fa-expand hidden-print">');
        side_panel.append(side_panel_splitbar);
        side_panel.append(side_panel_inner);
        side_panel_inner.append(side_panel_expand_contract);

        side_panel_expand_contract.attr({
            title: 'expand/contract panel',
            'data-toggle': 'tooltip'
        }).tooltip({
            placement: 'right'
        }).click(function () {
            var open = $(this).hasClass('fa-expand');
            var site = $('#site');
            slide_side_panel(main_panel, side_panel,
                open ? 100 : side_panel.data('last_width') || side_panel_start_width);
            $(this).toggleClass('fa-expand', !open).toggleClass('fa-compress', open);

            var tooltip_text = (open ? 'shrink to not' : 'expand to') + ' fill the window';
            if (open) {
                side_panel.insertAfter(site);
                site.slideUp();
                $('#header').slideUp();
                side_panel_inner.css({'margin-left': 0});
                side_panel_splitbar.hide();
            }
            else {
                side_panel.insertAfter(main_panel);
                $('#header').slideDown();
                site.slideDown({
                    complete: function() { events.trigger('resize-header.Page'); }
                });
                side_panel_inner.css({'margin-left': ''});
                side_panel_splitbar.show();
            }

            if (have_bs_tooltips) {
                side_panel_expand_contract.attr('title', tooltip_text);
                side_panel_expand_contract.tooltip('hide').tooltip('fixTitle');
            }
            else {
                side_panel_expand_contract.tooltip('option', 'content', tooltip_text);
            }
        });

        // bind events for resizing side panel
        side_panel_splitbar.mousedown(function (md_evt) {
            md_evt.preventDefault();
            $(document).mousemove(function (mm_evt) {
                mm_evt.preventDefault();
                var pix_w = side_panel.offset().left + side_panel.outerWidth() - mm_evt.pageX;
                var rel_w = 100 * (pix_w) / side_panel.parent().width();
                rel_w = rel_w > min_rel_width ? rel_w : min_rel_width;
                rel_w = rel_w < max_rel_width ? rel_w : max_rel_width;
                main_panel.css('width', (100 - rel_w) + '%');
                side_panel.css('width', rel_w + '%').data('last_width', rel_w);
            });
            return false;
        });
        $(document).mouseup(function (mu_evt) {
            $(document).unbind('mousemove');
        });

        return side_panel;
    };

    var slide_side_panel = function (main_panel, side_panel, desired_width) {

        var anim_opts = {
            step : function (now, tween) {
                main_panel.css('width', 100 - now + '%');
            }
        };

        if (desired_width === undefined) {
            if (side_panel.is(':hidden')) {
                desired_width = (side_panel.data('last_width') || side_panel_start_width);
            }
            else {
                desired_width = 0;
            }
        }

        var visible = desired_width > 0;
        if (visible) {
            main_panel.css({float: 'left', 'overflow-x': 'auto'});
            side_panel.show();
        }
        else {
            anim_opts['complete'] = function () {
                side_panel.hide();
                main_panel.css({float : '', 'overflow-x': '', width: ''});
            };
        }

        side_panel.animate({width: desired_width + '%'}, anim_opts);
        return visible;
    };

    //wstawienie danych do panelu
    var populate_side_panel = function(side_panel) {
        var side_panel_inner = side_panel.find('.side_panel_inner');
        var qh = IPython.quick_help;
        var strip_modal = function(into) {
            // strip qh modal, insert content into element 'into'
            $('.quickhelp').closest('.modal-body').children().children().appendTo(into);
        };

        if ($('.quickhelp').length > 0) {
            strip_modal(side_panel_inner);
        }
        else {
            // ensure quickhelp shortcuts modal won't show
            $('body').addClass('help_panel_hide');
            // get quickhelp to show shortcuts
            qh.show_keyboard_shortcuts();
            // attach handler for qh showing shortcuts
            var qh_dia = $(qh.shortcut_dialog);
            qh_dia.on('shown.bs.modal', function(evt) {
                strip_modal(side_panel_inner);
                // delicately pretend that it was never shown, unbind handlers
                qh_dia.on('hidden.bs.modal', function () {
                    $('body').removeClass('help_panel_hide');
                    qh_dia.off('hidden.bs.modal');
                }).off('shown.bs.modal').modal("hide");
            });
        }
        // make sure content we stripped will be rebuilt
        qh.force_rebuild = true;
    };

    //tworzy dowolny link
     var make_link = function(element,href_,text_){
         $(element).append(
             $('<a/>', {
                 href: href_
             }).html(text_).append($('<br>'))
         );
     };

    //tworzy link relatywny do katalogu roboczego
    var make_parent_link = function(element,document_,text_){
        var parent = utils.url_path_split(Jupyter.notebook.notebook_path)[0];
        $(element).append(
            $('<a/>', {
                href: utils.url_path_join(Jupyter.notebook.base_url,'tree', utils.encode_uri_components(parent), document_)
            }).html(text_).append($('<br>'))
        );
    };

    //proste wstawianie
    var insert_into_side_panel = function(side_panel) {
        var side_panel_inner = side_panel.find('.side_panel_inner');

        $("<p href=#>Dostepne notebooki</p>").appendTo(side_panel_inner);
        //$("<a href=#>Pokaz notebook 1</a><br>").appendTo(side_panel_inner);
        //$("<a href=#>Pokaz notebook 2</a><br>").appendTo(side_panel_inner);
        //$("<a href=#>Pokaz notebook 3</a><br>").appendTo(side_panel_inner);

        make_link(side_panel_inner,'#','Link dowolny');
        make_link(side_panel_inner,Jupyter.notebook.base_url,'Katalog główny');
        make_parent_link(side_panel_inner,'moj_probny.ipynb','Pokaz notebook 1');
        make_parent_link(side_panel_inner,'moj_probny.ipynb','Pokaz notebook 2');
        make_parent_link(side_panel_inner,'moj_probny.ipynb','Pokaz notebook 3');

    };

    var togglePanel = function () {
        var main_panel = $('#notebook_panel');
        var side_panel = $('#side_panel');

        if (side_panel.length < 1) {
            side_panel = $('<div id="side_panel"/>');
            build_side_panel(main_panel, side_panel,
                side_panel_min_rel_width, side_panel_max_rel_width);
            //populate_side_panel(side_panel);
            insert_into_side_panel(side_panel);
        }

        var visible = slide_side_panel(main_panel, side_panel);
        if (params.help_panel_add_toolbar_button) {
            $('#btn_help_panel').toggleClass('active', visible);
        }
        return visible;
    };
//***


    function load_ipython_extension() {

        //podlinkowanie stylu
        $('head').append(
            $('<link/>', {
                rel: 'stylesheet',
                type:'text/css',
                href: require.toUrl('./moj_panel.css')
            })
        );

        var action = {
            icon: 'fa-film', // a font-awesome class used on buttons, etc
            help: 'Pokaz panel boczny',
            help_index : 'to by mogla byc pomoc',
            handler : togglePanel
        };
        var prefix = 'moj_panel';
        var action_name = 'pokaz-panel';
        var full_action_name = Jupyter.actions.register(action, action_name, prefix);
        Jupyter.toolbar.add_buttons_group([full_action_name]);
    }
    return {
        load_ipython_extension: load_ipython_extension
    };
});