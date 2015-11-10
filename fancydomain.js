(function ( Fancy ) {
    "use strict";
    extend( Function.prototype, {
        wrap: function wrap( wrapper ) {
            var fn = this;
            return function () {
                return wrapper.apply( this, [ fn.bind( this ) ].concat( Array.prototype.slice.call( arguments ) ) );
            }
        }
    } );

    function argumentToArray( a ) {
        return Array.prototype.slice.call( a );
    }

    /**
     * @return {string}
     */
    function FancyDomainError( type, msg ) {
        return "Error[" + type + "]: " + msg;
    }

    function addMethods( functions, fn ) {
        var $super = fn.parent && fn.parent.prototype;
        each( functions, function ( value, property ) {
            if ( $super && Fancy.getType( value ) === "function" ) {
                var method = value;
                value      = (function ( m ) {
                    return function () { return $super[ m ].apply( this, arguments ); };
                })( property ).wrap( method );

                value.valueOf = (function ( m ) {
                    return function () { return m.valueOf.call( m ); };
                })( method );

                value.toString = (function ( m ) {
                    return function () { return m.toString.call( m ); };
                })( method );
            }
            fn.prototype[ property ] = value;
        } );

        return this;
    }

    function each( obj, callback ) {
        var i;
        if ( Fancy.getType( obj ) === "array" ) {
            if ( Array.prototype.forEach ) {
                obj.forEach( callback );
            } else {
                for ( i in obj ) {
                    if ( obj.hasOwnProperty( i ) ) {
                        if ( i.toString().match( /^\d*$/ ) ) {
                            callback( obj[ i ], i );
                        }
                    }
                }
            }
        } else if ( Fancy.getType( obj ) === "object" ) {
            for ( i in obj ) {
                if ( obj.hasOwnProperty( i ) ) {
                    callback( obj[ i ], i );
                }
            }
        }
    }

    function extend( a ) {
        var args = argumentToArray( arguments );
        args.shift();
        each( args, function ( it ) {
            for ( var i in it ) {
                if ( it.hasOwnProperty( i ) ) {
                    a[ i ] = it[ i ];
                }
            }
        } );
        return a;
    }

    function Subclass() {}

    function Domain( name, data, options, functions ) {
        var parent = null;
        if ( Fancy.getType( name ) === "function" ) {
            parent = name;
        } else {
            functions = options;
            options   = data;
            data      = name;
            name      = null;
            if ( !(data && Object.keys( data )[ 0 ] in options) ) {
                functions = options;
                options   = null;
            }
        }
        Superclass.parent       = parent;
        Superclass.subclasses   = [];
        Superclass.$properties  = {};
        Superclass.$constraints = {};

        if ( options ) {
            each( options, function ( it, i ) {
                Superclass.$constraints[ i ] = it;
            } );

        }
        if ( data ) {
            each( data, function ( it, i ) {
                var cons = Superclass.$constraints[ i ] || {};
                if ( Fancy.getType( it ) === "string" ) {
                    switch ( it.toLowerCase() ) {
                        case "number":
                        case "integer":
                            if ( Fancy.getType( cons.defaultValue ) === "number" ) {
                                Superclass.$properties[ i ] = cons.defaultValue;
                            } else {
                                Superclass.$properties[ i ] = null;
                            }
                            break;
                        case "double":
                        case "float":
                            if ( Fancy.getType( cons.defaultValue ) === "number" ) {
                                Superclass.$properties[ i ] = cons.defaultValue;
                            } else {
                                Superclass.$properties[ i ] = null;
                            }
                            break;
                        case "array":
                        case "list":
                            if ( Fancy.getType( cons.defaultValue ) === "array" ) {
                                Superclass.$properties[ i ] = cons.defaultValue;
                            } else {
                                Superclass.$properties[ i ] = null;
                            }
                            break;
                        case "object":
                        case "map":
                            if ( Fancy.getType( cons.defaultValue ) === "object" ) {
                                Superclass.$properties[ i ] = cons.defaultValue;
                            } else {
                                Superclass.$properties[ i ] = null;
                            }
                            break;
                        default:
                            if ( cons.defaultValue === undefined ) {
                                Superclass.$properties[ i ] = null;
                            } else {
                                Superclass.$properties[ i ] = cons.defaultValue;
                            }
                            break;
                    }
                } else {
                    Superclass.$properties[ i ] = null;
                }
            } );
        } else {
            console.warn( "No properties?" );
        }
        if ( parent ) {
            Subclass.prototype   = parent.prototype;
            Superclass.prototype = new Subclass;
            parent.subclasses.push( Superclass );
            extend( Superclass.$properties, parent.$properties );
            extend( Superclass.$constraints, parent.$constraints );
        }
        function init( object ) {
            extend( this, Superclass.$properties, object );
            this.checkConstraints();
        }

        Superclass.prototype.checkConstraints = function checkConstraints() {
            var SELF = this;
            each( Superclass.$constraints, function throwError( it, i ) {
                if ( it.nullable === false && SELF[ i ] === null ) {
                    throw FancyDomainError( "nullable", "You can not set \"" + i + "\" as null" );
                }
            } );
            return SELF;
        };

        function Superclass( object ) {
            if ( !(this instanceof Superclass) ) {
                return new Superclass( object );
            }
            init.call( this, object );
            return this;
        }

        addMethods( functions, Superclass );
        Superclass.prototype.constructor      = Superclass;
        return Superclass;
    }

    Fancy.domain = Domain;
})( Fancy );