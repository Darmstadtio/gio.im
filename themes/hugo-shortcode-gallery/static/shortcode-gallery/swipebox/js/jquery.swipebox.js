/*! Swipebox v1.4.4 | Constantin Saguin csag.co | MIT License | github.com/brutaldesign/swipebox */
/*
	With fixes from PR
	https://github.com/brutaldesign/swipebox/pull/324
	https://github.com/brutaldesign/swipebox/pull/298
	https://github.com/brutaldesign/swipebox/pull/287
	and issue
	https://github.com/brutaldesign/swipebox/issues/243
*/
"use strict";
;( function ( window, document, $, undefined ) {

	$.swipebox = function( elem, options ) {

		// Default options
		var ui,
			defaults = {
				useCSS : true,
				useCssLoadingAnimation: true,
				useSVG : true,
				initialIndexOnArray : 0,
				removeTopBarOnMobile : false,
				removeBottomBarOnMobile: false,
				hideCloseButtonOnMobile : false,
				hideBarsDelay : 5000,
				videoMaxWidth : 1140,
				vimeoColor : 'cccccc',
				beforeOpen: null,
				afterOpen: null,
				afterClose: null,
				afterMedia: null,
				nextSlide: null,
				prevSlide: null,
				loopAtEnd: false,
				autoplayVideos: false,
				queryStringData: {},
				toggleClassOnLoad: '',
				closeFadeOutTime: 500,
				selector: null
			},

			plugin = this,
			elements = [], // slides array [ { href:'...', title:'...' }, ...],
			$elem,
			selector = elem.selector,
			
			// isMobile = navigator.userAgent.match( /(iPad)|(iPhone)|(iPod)|(Android)|(PlayBook)|(BB10)|(BlackBerry)|(Opera Mini)|(IEMobile)|(webOS)|(MeeGo)/i ),
			
			isMobile = true,
			isTouch = isMobile !== null || document.createTouch !== undefined || ( 'ontouchstart' in window ) || ( 'onmsgesturechange' in window ) || navigator.msMaxTouchPoints,
			supportSVG = !! document.createElementNS && !! document.createElementNS( 'http://www.w3.org/2000/svg', 'svg').createSVGRect,
			winWidth = window.innerWidth ? window.innerWidth : $( window ).width(),
			winHeight = window.innerHeight ? window.innerHeight : $( window ).height(),
			currentX = 0,
			/* jshint multistr: true */
			html = '<div id="swipebox-overlay">\
					<div id="swipebox-container">\
						<div id="swipebox-slider"></div>\
						<div id="swipebox-top-bar">\
							<div id="swipebox-title"></div>\
						</div>\
						<div id="swipebox-bottom-bar">\
							<div id="swipebox-arrows">\
								<a id="swipebox-prev"></a>\
								<a id="swipebox-next"></a>\
								<div id="swipebox-description"></div>\
							</div>\
						</div>\
						<a id="swipebox-close"></a>\
					</div>\
			</div>';

		plugin.settings = {};

		$.swipebox.close = function () {
			ui.closeSlide();
		};

		$.swipebox.extend = function () {
			return ui;
		};

		plugin.init = function() {

			plugin.settings = $.extend( {}, defaults, options );

			if ( $.isArray( elem ) ) {

				elements = elem;
				ui.target = $( window );
				ui.init( plugin.settings.initialIndexOnArray );

			} else {

				$( elem ).on( 'click', plugin.settings.selector, function( event ) {

					// console.log( isTouch );

					if ( event.target.parentNode.className === 'slide current' ) {

						return false;
					}

					ui.destroy();

					if ( plugin.settings.selector === null ) {
						$elem = $( elem );
					} else {
						$elem = $( elem ).find( plugin.settings.selector );
					}

					elements = [];
					var index, relType, relVal;

					// Allow for HTML5 compliant attribute before legacy use of rel
					if ( ! relVal ) {
						relType = 'data-rel';
						relVal = $( this ).attr( relType );
					}

					if ( ! relVal ) {
						relType = 'rel';
						relVal = $( this ).attr( relType );
					}

					if ( relVal && relVal !== '' && relVal !== 'nofollow' ) {
						$elem = $elem.filter( '[' + relType + '="' + relVal + '"]' );
					}

					$elem.each( function() {

						var title = null,
							description = null,
							href = null;

						if ( $( this ).attr( 'title' ) ) {
							title = $( this ).attr( 'title' );
						}

						if ( $( this ).data( 'description' ) ) {
							description = $( this ).data( 'description' );
						}

						if ( $( this ).attr( 'href' ) ) {
							href = $( this ).attr( 'href' );
						}

						elements.push( {
							href: href,
							title: title,
							description: description
						} );
					} );

					index = $elem.index( $( this ) );
					event.preventDefault();
					event.stopPropagation();
					ui.target = $( event.target );
					ui.init( index );
				} );
			}
		};

		// https://github.com/brutaldesign/swipebox/issues/243
		plugin.refresh = function() {
			if (!$.isArray(elem)) {
				ui.destroy();
				$elem = $(selector);
				ui.actions();
			}
		};

		ui = {

			/**
			 * Initiate Swipebox
			 */
			init : function( index ) {
				if ( plugin.settings.beforeOpen ) {
					plugin.settings.beforeOpen();
				}
				this.target.trigger( 'swipebox-start' );
				$.swipebox.isOpen = true;
				this.build();
				this.openSlide( index );
				this.openMedia( index );
				this.preloadMedia( index+1 );
				this.preloadMedia( index-1 );
				if ( plugin.settings.afterOpen ) {
					plugin.settings.afterOpen(index);
				}
			},

			/**
			 * Built HTML containers and fire main functions
			 */
			build : function () {
				var $this = this, bg;

				$( 'body' ).append( html );

				if ( supportSVG && plugin.settings.useSVG === true ) {
					$( '#swipebox-overlay' ).addClass("useSvg");
				}

				if ( this.doCssLoadingAnimation() ) {
					$( '#swipebox-overlay' ).addClass("useCssLoadingAnimation");
				}

				if ( isMobile ){
					if( plugin.settings.removeBottomBarOnMobile ) {
						$( '#swipebox-bottom-bar' ).remove();
					}
					if( plugin.settings.removeTopBarOnMobile ) {
						$( '#swipebox-top-bar' ).remove();
					}
				}

				$.each( elements,  function() {
					$( '#swipebox-slider' ).append( '<div class="slide"></div>' );
				} );

				$this.setDim();
				$this.actions();

				if ( isTouch ) {
					// $this.gesture();
				}

				// Devices can have both touch and keyboard input so always allow key events
				$this.keyboard();

				$this.animBars();
				$this.resize();

			},

			/**
			 * Set dimensions depending on windows width and height
			 */
			setDim : function () {

				var width, height, sliderCss = {};

				// Reset dimensions on mobile orientation change
				if ( 'onorientationchange' in window ) {

					window.addEventListener( 'orientationchange', function() {
						if ( window.orientation === 0 ) {
							width = winWidth;
							height = winHeight;
						} else if ( window.orientation === 90 || window.orientation === -90 ) {
							width = winHeight;
							height = winWidth;
						}
					}, false );


				} else {

					width = window.innerWidth ? window.innerWidth : $( window ).width();
					height = window.innerHeight ? window.innerHeight : $( window ).height();
				}

				sliderCss = {
					width : width,
					height : height
				};

				$( '#swipebox-overlay' ).css( sliderCss );

			},

			/**
			 * Reset dimensions on window resize envent
			 */
			resize : function () {
				var $this = this;

				$( window ).resize( function() {
					$this.setDim();
				} ).resize();
			},

			/**
			 * Check if device supports CSS transitions
			 */
			supportTransition : function () {

				var prefixes = 'transition WebkitTransition MozTransition OTransition msTransition KhtmlTransition'.split( ' ' ),
					i;

				for ( i = 0; i < prefixes.length; i++ ) {
					if ( document.createElement( 'div' ).style[ prefixes[i] ] !== undefined ) {
						return prefixes[i];
					}
				}
				return false;
			},

			/**
			 * Check if CSS transitions are allowed (options + devicesupport)
			 */
			doCssTrans : function () {
				if ( plugin.settings.useCSS && this.supportTransition() ) {
					return true;
				}
			},

			/**
			 * Check if the CSS loading animation is allowed (options + devicesupport)
			 */
			doCssLoadingAnimation : function () {
				if ( plugin.settings.useCssLoadingAnimation && this.supportTransition() ) {
					return true;
				}
			},
			

			/**
			 * Touch navigation
			 */

			
			gesture : function () {
			/** 
				var $this = this,
					index,
					hDistance,
					vDistance,
					hDistanceLast,
					vDistanceLast,
					hDistancePercent,
					vSwipe = false,
					hSwipe = false,
					hSwipMinDistance = 10,
					vSwipMinDistance = 50,
					startCoords = {},
					endCoords = {},
					bars = $( '#swipebox-top-bar, #swipebox-bottom-bar' ),
					slider = $( '#swipebox-slider' );

				bars.addClass( 'visible-bars' );
				$this.setTimeout();

				$( 'body' ).bind( 'touchstart', function( event ) {

					$( this ).addClass( 'touching' );
					index = $( '#swipebox-slider .slide' ).index( $( '#swipebox-slider .slide.current' ) );
					endCoords = event.originalEvent.targetTouches[0];
					startCoords.pageX = event.originalEvent.targetTouches[0].pageX;
					startCoords.pageY = event.originalEvent.targetTouches[0].pageY;

					$( '#swipebox-slider' ).css( {
						'-webkit-transform' : 'translate3d(' + currentX +'%, 0, 0)',
						'transform' : 'translate3d(' + currentX + '%, 0, 0)'
					} );

					$( '.touching' ).bind( 'touchmove',function( event ) {
						event.preventDefault();
						event.stopPropagation();
						endCoords = event.originalEvent.targetTouches[0];

						if ( ! hSwipe ) {
							vDistanceLast = vDistance;
							vDistance = endCoords.pageY - startCoords.pageY;
							if ( Math.abs( vDistance ) >= vSwipMinDistance || vSwipe ) {
								var opacity = 0.75 - Math.abs(vDistance) / slider.height();

								slider.css( { 'top': vDistance + 'px' } );
								slider.css( { 'opacity': opacity } );

								vSwipe = true;
							}
						}

						hDistanceLast = hDistance;
						hDistance = endCoords.pageX - startCoords.pageX;
						hDistancePercent = hDistance * 100 / winWidth;

						if ( ! hSwipe && ! vSwipe && Math.abs( hDistance ) >= hSwipMinDistance ) {
							$( '#swipebox-slider' ).css( {
								'-webkit-transition' : '',
								'transition' : ''
							} );
							hSwipe = true;
						}

						if ( hSwipe ) {

							// swipe left
							if ( 0 < hDistance ) {

								// first slide
								if ( 0 === index ) {
									// console.log( 'first' );
									$( '#swipebox-overlay' ).addClass( 'leftSpringTouch' );
								} else {
									// Follow gesture
									$( '#swipebox-overlay' ).removeClass( 'leftSpringTouch' ).removeClass( 'rightSpringTouch' );
									$( '#swipebox-slider' ).css( {
										'-webkit-transform' : 'translate3d(' + ( currentX + hDistancePercent ) +'%, 0, 0)',
										'transform' : 'translate3d(' + ( currentX + hDistancePercent ) + '%, 0, 0)'
									} );
								}

							// swipe rught
							} else if ( 0 > hDistance ) {

								// last Slide
								if ( elements.length === index +1 ) {
									// console.log( 'last' );
									$( '#swipebox-overlay' ).addClass( 'rightSpringTouch' );
								} else {
									$( '#swipebox-overlay' ).removeClass( 'leftSpringTouch' ).removeClass( 'rightSpringTouch' );
									$( '#swipebox-slider' ).css( {
										'-webkit-transform' : 'translate3d(' + ( currentX + hDistancePercent ) +'%, 0, 0)',
										'transform' : 'translate3d(' + ( currentX + hDistancePercent ) + '%, 0, 0)'
									} );
								}

							}
						}
					} );

					return false;

				} ).bind( 'touchend',function( event ) {
					event.preventDefault();
					event.stopPropagation();

					$( '#swipebox-slider' ).css( {
						'-webkit-transition' : '-webkit-transform 0.4s ease',
						'transition' : 'transform 0.4s ease'
					} );

					vDistance = endCoords.pageY - startCoords.pageY;
					hDistance = endCoords.pageX - startCoords.pageX;
					hDistancePercent = hDistance*100/winWidth;

					// Swipe to bottom to close
					if ( vSwipe ) {
						vSwipe = false;
						if ( Math.abs( vDistance ) >= 2 * vSwipMinDistance && Math.abs( vDistance ) > Math.abs( vDistanceLast ) ) {
							var vOffset = vDistance > 0 ? slider.height() : - slider.height();
							slider.animate( { top: vOffset + 'px', 'opacity': 0 },
								300,
								function () {
									$this.closeSlide();
								} );
						} else {
							slider.animate( { top: 0, 'opacity': 1 }, 300 );
						}

					} else if ( hSwipe ) {

						hSwipe = false;

						// swipeLeft
						if( hDistance >= hSwipMinDistance && hDistance >= hDistanceLast) {

							$this.getPrev();

						// swipeRight
						} else if ( hDistance <= -hSwipMinDistance && hDistance <= hDistanceLast) {

							$this.getNext();
						}

					} else { // Top and bottom bars have been removed on touchable devices
						// tap
						if ( ! bars.hasClass( 'visible-bars' ) ) {
							$this.showBars();
							$this.setTimeout();
						} else {
							$this.clearTimeout();
							$this.hideBars();
						}
					}

					$( '#swipebox-slider' ).css( {
						'-webkit-transform' : 'translate3d(' + currentX + '%, 0, 0)',
						'transform' : 'translate3d(' + currentX + '%, 0, 0)'
					} );

					$( '#swipebox-overlay' ).removeClass( 'leftSpringTouch' ).removeClass( 'rightSpringTouch' );
					$( '.touching' ).off( 'touchmove' ).removeClass( 'touching' );

				} );
			*/
			},

			/**
			 * Set timer to hide the action bars
			 */
			setTimeout: function () {
				if ( plugin.settings.hideBarsDelay > 0 ) {
					var $this = this;
					$this.clearTimeout();
					$this.timeout = window.setTimeout( function() {
							$this.hideBars();
						},

						plugin.settings.hideBarsDelay
					);
				}
			},

			/**
			 * Clear timer
			 */
			clearTimeout: function () {
				window.clearTimeout( this.timeout );
				this.timeout = null;
			},

			/**
			 * Show navigation and title bars
			 */
			showBars : function () {
				var bars = $( '#swipebox-top-bar, #swipebox-bottom-bar' );
				if ( this.doCssTrans() ) {
					bars.addClass( 'visible-bars' );
				} else {
					$( '#swipebox-top-bar' ).animate( { top : 0 }, 500 );
					$( '#swipebox-bottom-bar' ).animate( { bottom : 0 }, 500 );
					setTimeout( function() {
						bars.addClass( 'visible-bars' );
					}, 1000 );
				}
			},

			/**
			 * Hide navigation and title bars
			 */
			hideBars : function () {
				var bars = $( '#swipebox-top-bar, #swipebox-bottom-bar' );
				if ( this.doCssTrans() ) {
					bars.removeClass( 'visible-bars' );
				} else {
					$( '#swipebox-top-bar' ).animate( { top : '-50px' }, 500 );
					$( '#swipebox-bottom-bar' ).animate( { bottom : '-50px' }, 500 );
					setTimeout( function() {
						bars.removeClass( 'visible-bars' );
					}, 1000 );
				}
			},

			/**
			 * Animate navigation and top bars
			 */
			animBars : function () {
				var $this = this,
					bars = $( '#swipebox-top-bar, #swipebox-bottom-bar' );

				bars.addClass( 'visible-bars' );
				$this.setTimeout();

				$( '#swipebox-slider' ).click( function() {
					if ( ! bars.hasClass( 'visible-bars' ) ) {
						$this.showBars();
						$this.setTimeout();
					}
				} );

				$( '#swipebox-bottom-bar' ).hover( function() {
					$this.showBars();
					bars.addClass( 'visible-bars' );
					$this.clearTimeout();

				}, function() {
					if ( plugin.settings.hideBarsDelay > 0 ) {
						bars.removeClass( 'visible-bars' );
						$this.setTimeout();
					}

				} );
			},

			/**
			 * Keyboard navigation
			 */
			keyboard : function () {
				
				var $this = this;
				$( window ).bind( 'keyup', function( event ) {
					event.preventDefault();
					event.stopPropagation();

					if ( event.keyCode === 37 ) {

						$this.getPrev();

					} else if ( event.keyCode === 39 ) {

						$this.getNext();

					} else if ( event.keyCode === 27 ) {

						$this.closeSlide();
					}
				} );
				
			},

			/**
			 * Navigation events : go to next slide, go to prevous slide and close
			 */
			actions : function () {
				var $this = this,
					action = 'touchend click'; // Just detect for both event types to allow for multi-input

				if ( elements.length < 2 ) {

					$( '#swipebox-bottom-bar' ).hide();

					if ( undefined === elements[ 1 ] ) {
						$( '#swipebox-top-bar' ).hide();
					}

				} else {
					$( '#swipebox-prev' ).bind( action, function( event ) {
						event.preventDefault();
						event.stopPropagation();
						$this.getPrev();
						$this.setTimeout();
					} );

					$( '#swipebox-next' ).bind( action, function( event ) {
						event.preventDefault();
						event.stopPropagation();
						$this.getNext();
						$this.setTimeout();
					} );
				}

				$( '#swipebox-close' ).bind( action, function( event ) {
					event.preventDefault();
					event.stopPropagation();
					$this.closeSlide();
				} );
			},

			/**
			 * Set current slide
			 */
			setSlide : function ( index, isFirst ) {

				isFirst = isFirst || false;

				var slider = $( '#swipebox-slider' );

				currentX = -index*100;

				if ( this.doCssTrans() ) {
					slider.css( {
						'-webkit-transform' : 'translate3d(' + (-index*100)+'%, 0, 0)',
						'transform' : 'translate3d(' + (-index*100)+'%, 0, 0)'
					} );
				} else {
					slider.animate( { left : ( -index*100 )+'%' } );
				}

				$( '#swipebox-slider .slide' ).removeClass( 'current' );
				$( '#swipebox-slider .slide' ).eq( index ).addClass( 'current' );
				this.setTitle( index );

				if ( isFirst ) {
					slider.fadeIn();
				}

				$( '#swipebox-prev, #swipebox-next' ).removeClass( 'disabled' );

				if ( index === 0 ) {
					$( '#swipebox-prev' ).addClass( 'disabled' );
				} else if ( index === elements.length - 1 && plugin.settings.loopAtEnd !== true ) {
					$( '#swipebox-next' ).addClass( 'disabled' );
				}
			},

			/**
			 * Open slide
			 */
			openSlide : function ( index ) {
				$( 'html' ).addClass( 'swipebox-html' );
				if ( isTouch ) {
					$( 'html' ).addClass( 'swipebox-touch' );

					if ( plugin.settings.hideCloseButtonOnMobile ) {
						$( 'html' ).addClass( 'swipebox-no-close-button' );
					}
				} else {
					$( 'html' ).addClass( 'swipebox-no-touch' );
				}
				$( window ).trigger( 'resize' ); // fix scroll bar visibility on desktop
				this.setSlide( index, true );
			},

			/**
			 * Set a time out if the media is a video
			 */
			preloadMedia : function ( index ) {
				var $this = this,
					src = null;

				if ( elements[ index ] !== undefined ) {
					src = elements[ index ].href;
				}

				if ( ! $this.isVideo( src ) ) {
					setTimeout( function() {
						$this.openMedia( index );
					}, 1000);
				} else {
					$this.openMedia( index );
				}
			},

			/**
			 * Open
			 */
			openMedia : function ( index ) {
				var $this = this,
					src,
					slide;

				if ( elements[ index ] !== undefined ) {
					src = elements[ index ].href;
				}

				if ( index < 0 || index >= elements.length ) {
					return false;
				}

				slide = $( '#swipebox-slider .slide' ).eq( index );

				if ( ! $this.isVideo( src ) ) {
					slide.addClass( 'slide-loading' );
					if( $this.doCssLoadingAnimation() ){
						const loadingHtml = $('\
						<div class="loading-animation-wrapper">\
							<span class="loading"></span>\
						</div>');
						slide.append(loadingHtml);
					}
					
					$this.loadMedia( src, function() {
						slide.removeClass( 'slide-loading' );
						slide.html( this );

						if ( plugin.settings.afterMedia ) {
							plugin.settings.afterMedia( index );
						}
					} );
				} else {
					slide.html( $this.getVideo( src ) );

					if ( plugin.settings.afterMedia ) {
						plugin.settings.afterMedia( index );
					}
				}

			},

			/**
			 * Set link title attribute as caption
			 */
			setTitle : function ( index ) {
				var title = null,
					description = null;

				$( '#swipebox-title' ).empty();

				if ( elements[ index ] !== undefined ) {
					title = elements[ index ].title;
					description = elements[ index ].description;
				}

				
				if ( title ) {
					$( '#swipebox-top-bar' ).show();
					$( '#swipebox-title' ).append( title );
				} else {
					$( '#swipebox-top-bar' ).hide();
				}

				$( '#swipebox-description' ).empty();
				$( '#swipebox-description' ).append( description );
			},

			/**
			 * Check if the URL is a video
			 */
			isVideo : function ( src ) {

				if ( src ) {
					if ( src.match( /(youtube\.com|youtube-nocookie\.com)\/watch\?v=([a-zA-Z0-9\-_]+)/) || src.match( /vimeo\.com\/([0-9]*)/ ) || src.match( /youtu\.be\/([a-zA-Z0-9\-_]+)/ ) ) {
						return true;
					}

					if ( src.toLowerCase().indexOf( 'swipeboxvideo=1' ) >= 0 ) {

						return true;
					}
				}

			},

			/**
			 * Parse URI querystring and:
			 * - overrides value provided via dictionary
			 * - rebuild it again returning a string
			 */
			parseUri : function (uri, customData) {
				var a = document.createElement('a'),
					qs = {};

				// Decode the URI
				a.href = decodeURIComponent( uri );

				// QueryString to Object
				if ( a.search ) {
					qs = JSON.parse( '{"' + a.search.toLowerCase().replace('?','').replace(/&/g,'","').replace(/=/g,'":"') + '"}' );
				}
				
				// Extend with custom data
				if ( $.isPlainObject( customData ) ) {
					qs = $.extend( qs, customData, plugin.settings.queryStringData ); // The dev has always the final word
				}

				// Return querystring as a string
				return $
					.map( qs, function (val, key) {
						if ( val && val > '' ) {
							return encodeURIComponent( key ) + '=' + encodeURIComponent( val );
						}
					})
					.join('&');
			},

			/**
			 * Get video iframe code from URL
			 */
			getVideo : function( url ) {
				var iframe = '',
					youtubeUrl = url.match( /((?:www\.)?youtube\.com|(?:www\.)?youtube-nocookie\.com)\/watch\?v=([a-zA-Z0-9\-_]+)/ ),
					youtubeShortUrl = url.match(/(?:www\.)?youtu\.be\/([a-zA-Z0-9\-_]+)/),
					vimeoUrl = url.match( /(?:www\.)?vimeo\.com\/([0-9]*)/ ),
					qs = '';
				if ( youtubeUrl || youtubeShortUrl) {
					if ( youtubeShortUrl ) {
						youtubeUrl = youtubeShortUrl;
					}
					qs = ui.parseUri( url, {
						'autoplay' : ( plugin.settings.autoplayVideos ? '1' : '0' ),
						'v' : ''
					});
					iframe = '<iframe width="560" height="315" src="//' + youtubeUrl[1] + '/embed/' + youtubeUrl[2] + '?' + qs + '" frameborder="0" allowfullscreen></iframe>';

				} else if ( vimeoUrl ) {
					qs = ui.parseUri( url, {
						'autoplay' : ( plugin.settings.autoplayVideos ? '1' : '0' ),
						'byline' : '0',
						'portrait' : '0',
						'color': plugin.settings.vimeoColor
					});
					iframe = '<iframe width="560" height="315"  src="//player.vimeo.com/video/' + vimeoUrl[1] + '?' + qs + '" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>';

				} else {
					iframe = '<iframe width="560" height="315" src="' + url + '" frameborder="0" allowfullscreen></iframe>';
				}

				return '<div class="swipebox-video-container" style="max-width:' + plugin.settings.videoMaxWidth + 'px"><div class="swipebox-video">' + iframe + '</div></div>';
			},

			/**
			 * Load image
			 */
			loadMedia : function ( src, callback ) {
                // Inline content
                if ( src.trim().indexOf('#') === 0 ) {
                    callback.call(
                    	$('<div>', {
                    		'class' : 'swipebox-inline-container'
                    	})
                    	.append(
                    		$(src)
	                    	.clone()
	                    	.toggleClass( plugin.settings.toggleClassOnLoad )
	                    )
                    );
                }
                // Everything else
                else {
    				if ( ! this.isVideo( src ) ) {
    					var img = $( '<img>' ).on( 'load', function() {
    						callback.call( img );
    					} );

    					img.attr( 'src', src );
    				}
                }
			},

			/**
			 * Get next slide
			 */
			getNext : function () {
				var $this = this,
					src,
					index = $( '#swipebox-slider .slide' ).index( $( '#swipebox-slider .slide.current' ) );
				if ( index + 1 < elements.length ) {

					src = $( '#swipebox-slider .slide' ).eq( index ).contents().find( 'iframe' ).attr( 'src' );
					$( '#swipebox-slider .slide' ).eq( index ).contents().find( 'iframe' ).attr( 'src', src );
					index++;
					$this.setSlide( index );
					$this.preloadMedia( index+1 );
					if ( plugin.settings.nextSlide ) {
						plugin.settings.nextSlide(index);
					}
				} else {

					if ( plugin.settings.loopAtEnd === true ) {
						src = $( '#swipebox-slider .slide' ).eq( index ).contents().find( 'iframe' ).attr( 'src' );
						$( '#swipebox-slider .slide' ).eq( index ).contents().find( 'iframe' ).attr( 'src', src );
						index = 0;
						$this.preloadMedia( index );
						$this.setSlide( index );
						$this.preloadMedia( index + 1 );
						if ( plugin.settings.nextSlide ) {
							plugin.settings.nextSlide(index);
						}
					} else {
						$( '#swipebox-overlay' ).addClass( 'rightSpring' );
						setTimeout( function() {
							$( '#swipebox-overlay' ).removeClass( 'rightSpring' );
						}, 500 );
					}
				}
			},

			/**
			 * Get previous slide
			 */
			getPrev : function () {
				var index = $( '#swipebox-slider .slide' ).index( $( '#swipebox-slider .slide.current' ) ),
					src;
				if ( index > 0 ) {
					src = $( '#swipebox-slider .slide' ).eq( index ).contents().find( 'iframe').attr( 'src' );
					$( '#swipebox-slider .slide' ).eq( index ).contents().find( 'iframe' ).attr( 'src', src );
					index--;
					this.setSlide( index );
					this.preloadMedia( index-1 );
					if ( plugin.settings.prevSlide ) {
						plugin.settings.prevSlide(index);
					}
				} else {
					$( '#swipebox-overlay' ).addClass( 'leftSpring' );
					setTimeout( function() {
						$( '#swipebox-overlay' ).removeClass( 'leftSpring' );
					}, 500 );
				}
			},
			/* jshint unused:false */
			nextSlide : function ( index ) {
				// Callback for next slide
			},

			prevSlide : function ( index ) {
				// Callback for prev slide
			},

			/**
			 * Close
			 */
			closeSlide : function () {
				if( plugin.settings.closeFadeOutTime > 0){
					$('#swipebox-overlay').fadeOut(  plugin.settings.closeFadeOutTime, function() { // fade out overlay
						this.destroy(); 
					}.bind(this));
				}
				$( 'html' ).removeClass( 'swipebox-html' );
				$( 'html' ).removeClass( 'swipebox-touch' );
				$( window ).trigger( 'resize' );
				if(plugin.settings.closeFadeOutTime <= 0){
					this.destroy();
				}
			},

			/**
			 * Destroy the whole thing
			 */
			destroy : function () {
				$( window ).unbind( 'keyup' );
				$( 'body' ).unbind( 'touchstart' );
				$( 'body' ).unbind( 'touchmove' );
				$( 'body' ).unbind( 'touchend' );
				$( '#swipebox-slider' ).unbind();
				$( '#swipebox-overlay' ).remove();

				if ( ! $.isArray( elem ) ) {
					elem.removeData( '_swipebox' );
				}

				if ( this.target ) {
					this.target.trigger( 'swipebox-destroy' );
				}

				$.swipebox.isOpen = false;

				if ( plugin.settings.afterClose ) {
					plugin.settings.afterClose();
				}
			}
		};

		plugin.init();
	};

	$.fn.swipebox = function( options ) {

		if ( ! $.data( this, '_swipebox' ) ) {
			var swipebox = new $.swipebox( this, options );
			this.data( '_swipebox', swipebox );
		}
		return this.data( '_swipebox' );

	};

}( window, document, jQuery ) );
