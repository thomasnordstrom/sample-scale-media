//Dependencies: Soundcloud API, SoundManager JS script
$(document).ready(function(){

    var cnfg_txt_play = "Play";
    var cnfg_txt_pause = "Pause";
    var cnfg_txt_loading = "Loading...";
    var cnfg_txt_failed_load = "Track not found";

    var cnfg_txt_onfinish = "Soundcloud";
    var cnfg_opacity_default = "0";
    var cnfg_opacity_hover = "0.90";
    var cnfg_opacity_selected = "0.80";

    var is_iOS = (navigator.userAgent.match(/(iPad|iPhone|iPod)/i) ? true : false);
    var is_Android = (navigator.userAgent.match(/Android/i) ? true : false);
    var is_touchDevice = false;

    if(is_iOS || is_Android){
        is_touchDevice = true;
    }

    jQuery.fn.modifyTouchDevice = function(){
        if(is_touchDevice){
            $(this).addClass("touch_device");
        }
        return false;
    };

    jQuery.fn.animateBlock = function(e){
        var args = arguments[0] || {};
        var opacity_default = args.opacity_default;
        var opacity_hover = args.opacity_hover;

        if(is_touchDevice){
            var event_type = "touchstart touchend";
        } else {
            var event_type = "mouseenter mouseleave";
        }

        $(this).on(event_type, function (ev) {
            if(ev.type === "mouseenter"){
                $(this).stop().animate({opacity: opacity_hover},{queue:false,duration:250});
            } else if (ev.type === "mouseleave") {
                $(this).stop().animate({opacity:opacity_default},{queue:false,duration:200});
            } else if(ev.type === "touchstart"){
                $(this).stop().animate({opacity: opacity_hover},{queue:false,duration:250});
                $(this).off("touchstart");//need to turn off touch start event so sound can be played

                //remove info layer and add animation for all others
                $(".album_info_wrapper").not($(this)).stop().animate({opacity:opacity_default},{queue:false,duration:200});
                $(".album_info_wrapper").not($(this)).animateBlock({opacity_default: cnfg_opacity_default, opacity_hover: cnfg_opacity_hover});

                //find element which is playing so we can exclude this
                var self_sc_link = $(this).find(".soundcloud_link");
                $(document).scControlAll(self_sc_link, "stopAll");
            } else if(ev.type === "touchend"){

            }
            ev.preventDefault();
        });

        return false;
    };

    jQuery.fn.scControlAll = function(e, control_type){
        if("undefined" !== typeof soundManager){

            var cntrl_all_trackstate = "";
            var cntrl_all_txt = "";

            if(control_type == "pauseAll"){
                soundManager.pauseAll();//pause all just in case to prevent multiple tracks playing at once
                cntrl_all_trackstate = "paused";
                cntrl_all_txt = cnfg_txt_play;
            } else if(control_type == "stopAll"){
                soundManager.stopAll();
                cntrl_all_trackstate = "";
                cntrl_all_txt = cnfg_txt_onfinish;
            } else {
                return false;
            }

            //replace all playing states with pause txt and pause state (exclude clicked item):

            if("undefined" !== typeof e){
                var other_albums = $(".soundcloud_link").not($(e));
            } else {
                var other_albums = $(".soundcloud_link");
            }

            other_albums.each(function(index) {
                var sc_link = $(this);
                var sc_trackid = sc_link.data("trackid");
                var sc_trackstate = sc_link.data("trackstate");
                var sc_info_wrapper = sc_link.closest(".album_info_wrapper");

                if("undefined" !== typeof sc_trackstate){
                    if(sc_trackstate == "playing" || sc_trackstate == "paused"){
                        sc_link.removeClass("soundcloud_playing");
                        sc_link.data("trackstate", cntrl_all_trackstate);
                        sc_link.text(cntrl_all_txt);

                        if(("undefined" !== typeof sc_trackid) && (control_type == "stopAll")){
                            sc_link.data("sc_trackid", "");
                        }

                        if(is_touchDevice){

                        } else {
                            sc_info_wrapper.css({opacity: cnfg_opacity_default});
                            sc_info_wrapper.off("hover");
                            sc_info_wrapper.animateBlock({opacity_default: cnfg_opacity_default, opacity_hover: cnfg_opacity_hover});
                        }
                    } else if(sc_trackstate == "failed"){
                        sc_link.removeClass("soundcloud_playing");

                        if(is_touchDevice){

                        } else {
                            sc_info_wrapper.css({opacity: cnfg_opacity_default});
                            sc_info_wrapper.off("hover");
                            sc_info_wrapper.animateBlock({opacity_default: cnfg_opacity_default, opacity_hover: cnfg_opacity_hover});
                        }
                    }
                }
            });
        }
        return false;
    };

    jQuery.fn.scPlaySound = function(e){

        $(this).on("click", function(e){

            var sc_started_playing = false;

            var sc_play_resume = false;
            var sc_link = $(this);
            var sc_trackid = sc_link.data("trackid");
            var sc_trackstate = sc_link.data("trackstate");
            var sc_lnk_txt = "";
            var sc_url = sc_link.data("listenurl");
            var sc_info_wrapper = sc_link.closest(".album_info_wrapper");

            sc_url = sc_url.replace(/^https:\/\/api\.soundcloud\.com/, "");

            if(is_touchDevice){

            } else {
                $(document).scControlAll(this, "pauseAll");//pause all playing items (is_touchDevice will pause on touch event)
                sc_info_wrapper.off("hover");
                sc_info_wrapper.animateBlock({opacity_default: cnfg_opacity_selected, opacity_hover: cnfg_opacity_hover});
            }

            //create html5 data attributes
            if("undefined" !== typeof sc_trackid){

            } else {
                sc_trackid = sc_link.data("trackid", "");
            }
            if("undefined" !== typeof sc_trackstate){

            } else {
                sc_trackstate = sc_link.data("trackstate", "");
            }
            sc_trackid = sc_link.data("trackid");

            if("undefined" !== typeof soundManager){

                if(sc_trackid != ""){
                    if(sc_trackstate == "playing"){
                        soundManager.pause(sc_trackid);
                        sc_play_resume = true;
                        sc_link.data("trackstate", "paused");
                        sc_lnk_txt = cnfg_txt_play;
                        sc_link.removeClass("soundcloud_playing");
                    } else if(sc_trackstate == "paused") {
                        soundManager.resume(sc_trackid);
                        sc_play_resume = true;
                        sc_link.data("trackstate", "playing");
                        sc_lnk_txt = cnfg_txt_pause;
                        sc_link.addClass("soundcloud_playing");
                    } else {//no track state - rewind and start from beginning
                        soundManager.play(sc_trackid);
                        sc_play_resume = true;
                        sc_link.data("trackstate", "playing");
                        sc_lnk_txt = cnfg_txt_pause;
                        sc_link.addClass("soundcloud_playing");
                    }
                }
                if(sc_lnk_txt != ""){
                    sc_link.text(sc_lnk_txt);
                }
            }

            if(sc_play_resume == false){

                sc_link.text(cnfg_txt_loading);
                sc_link.addClass("soundcloud_loading");

                SC.whenStreamingReady(function(){
                    SC.stream(sc_url, {autoPlay: true,
                        onfinish: function() {
                            sc_started_playing = false;
                            sc_link.text(cnfg_txt_onfinish);
                            sc_link.data("trackstate", "");
                            sc_link.removeClass("soundcloud_playing");
                        }, onload: function() {
                            if(this.readyState == 2){//failed loading track
                                sc_started_playing = false;
                                sc_link.off("click")
                                sc_link.data("trackid", "");
                                sc_link.text(cnfg_txt_failed_load);
                                sc_link.data("trackstate", "failed");
                                $.reportError("music_releases", "Soundcloud track load failed.", "Track url: " + sc_link.data("listenurl"), 2, 0);
                            }
                        },
                        onconnect: function() {
                            var sc_is_connected = this.connected ? true : false;
                            if(sc_is_connected == true){
                                sc_link.data("trackid", this.sID);
                                sc_trackid = sc_link.data("trackid");
                                sc_link.data("trackstate", "playing");
                            }
                        },
                        whileplaying: function() {
                            if(this.position > 0 && sc_started_playing == false){
                                //check if track id has been set into data attr (on connect may not have set it yet):
                                if((sc_link.data("trackid") == "" || sc_link.data("trackid") == "undefined") && this.sID != ""){
                                    sc_link.data("trackid", this.sID);
                                    sc_trackid = sc_link.data("trackid");
                                    sc_link.data("trackstate", "playing");
                                }

                                sc_link.text(cnfg_txt_pause);
                                sc_link.removeClass("soundcloud_loading");
                                sc_link.addClass("soundcloud_playing");
                                sc_started_playing = true;
                            }
                        }
                    });
                });
            }
            if(is_touchDevice){//prevent hover state
                e.stopPropagation();
            }
            e.preventDefault();
        });
        return false;
    };

    $(".album_thumb_wrapper .album_info_wrapper").animateBlock({opacity_default: cnfg_opacity_default, opacity_hover: cnfg_opacity_hover});
    $(".soundcloud_link").scPlaySound();

});