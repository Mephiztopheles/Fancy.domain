(function( Fancy ) {
    extend( Function.prototype, {
        wrap: function wrap( wrapper ) {
            var fn = this;
            return function() {
                return wrapper.apply( this, [ fn.bind( this ) ].concat( Array.prototype.slice.call( arguments ) ) );
            }
        }
    } );

    function secureFunction( fn, msg ) {
        var r      = function() {return "function " + msg + "() { [native code] }";};
        fn.valueOf = fn.toString = r;
    }

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
        each( functions, function( value, property ) {
            if( $super && Fancy.getType( value ) === "function" ) {
                var method  = value;
                value       = {};
                value.value = (function( m ) {
                    return function() { return $super[ m ].apply( this, arguments ); };
                })( property ).wrap( method );

                value.value.valueOf = (function( m ) {
                    return function() { return m.valueOf.call( m ); };
                })( method );

                value.value.toString = (function( m ) {
                    return function() { return m.toString.call( m ); };
                })( method );
            }
            if( Fancy.getType( value ) === "object" ) {
                Object.defineProperty( fn.prototype, property, value );
            }
        } );

        return this;
    }

    function each( obj, callback ) {
        var i;
        if( Fancy.getType( obj ) === "array" ) {
            if( Array.prototype.forEach ) {
                obj.forEach( callback );
            } else {
                for( i in obj ) {
                    if( obj.hasOwnProperty( i ) ) {
                        if( i.toString().match( /^\d*$/ ) ) {
                            callback( obj[ i ], i );
                        }
                    }
                }
            }
        } else if( Fancy.getType( obj ) === "object" ) {
            for( i in obj ) {
                if( obj.hasOwnProperty( i ) ) {
                    callback( obj[ i ], i );
                }
            }
        }
    }

    function extend( a ) {
        var args = argumentToArray( arguments );
        args.shift();
        each( args, function( it ) {
            for( var i in it ) {
                Object.defineProperty( a, i, Object.getOwnPropertyDescriptor( it, i ) );
            }
        } );
        return a;
    }

    function Subclass() {}

    function Domain( name, data, options ) {
        var parent = null;
        if( Fancy.getType( name ) === "function" ) {
            parent = name;
        } else {
            options = data;
            data    = name;
            name    = null;
        }
        options = options || {};
        function Superclass( object ) {
            if( !(this instanceof Superclass) ) {
                return new Superclass( object );
            }
            init.call( this, object );
            return this;
        }

        secureFunction( Superclass, "Domain" );
        Superclass.$parent      = parent;
        Superclass.$subclasses  = [];
        Superclass.$properties  = {};
        Superclass.$constraints = options.constraints || {};
        Superclass.$hasMany     = options.hasMany || {};

        if( options.hasMany ) {
            console.log( options.hasMany.members.name )
        }
        if( data ) {
            each( data, function( it, i ) {
                var cons = Superclass.$constraints[ i ] || {};
                if( Fancy.getType( it ) === "string" ) {
                    switch( it.toLowerCase() ) {
                        case "number":
                        case "integer":
                            if( Fancy.getType( cons.defaultValue ) === "number" ) {
                                Superclass.$properties[ i ] = cons.defaultValue;
                            } else {
                                Superclass.$properties[ i ] = null;
                            }
                            break;
                        case "double":
                        case "float":
                            if( Fancy.getType( cons.defaultValue ) === "number" ) {
                                Superclass.$properties[ i ] = cons.defaultValue;
                            } else {
                                Superclass.$properties[ i ] = null;
                            }
                            break;
                        case "array":
                        case "list":
                            if( Fancy.getType( cons.defaultValue ) === "array" ) {
                                Superclass.$properties[ i ] = cons.defaultValue;
                            } else {
                                Superclass.$properties[ i ] = null;
                            }
                            break;
                        case "object":
                        case "map":
                            if( Fancy.getType( cons.defaultValue ) === "object" ) {
                                Superclass.$properties[ i ] = cons.defaultValue;
                            } else {
                                Superclass.$properties[ i ] = null;
                            }
                            break;
                        default:
                            if( cons.defaultValue === undefined ) {
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
        if( parent ) {
            Subclass.prototype   = parent.prototype;
            Superclass.prototype = new Subclass;
            parent.$subclasses.push( Superclass );
            extend( Superclass.$properties, parent.$properties );
            extend( Superclass.$constraints, parent.$constraints );
        }
        function init( object ) {
            var SELF = this;
            extend( SELF, Superclass.$properties, object );
            each( options.transients, function( it, i ) {
                Object.defineProperty( SELF, i, it );
            } );
            each( options.hasMany, function( it, i ) {
                var list = object[ i ] || [];

                Object.defineProperty( SELF, i, {
                    get: function() {
                        return list;
                    },
                    set: function( value ) {
                        if( Fancy.getType( value ) === "array" ) {
                            list = value;
                        } else {
                            throw FancyDomainError( "hasMany", "You can not set \"" + i + "\" as " + Fancy.getType( value ) );
                        }
                    }
                } )
            } );
            this.checkConstraints();
            this.checkHasMany();
        }

        function checkConstraints() {
            var SELF = this;
            each( Superclass.$constraints, function throwError( it, i ) {
                if( it.nullable === false && SELF[ i ] === null ) {
                    throw FancyDomainError( "nullable", "You can not set \"" + i + "\" as null" );
                }
            } );
            return SELF;
        }

        secureFunction( checkConstraints, "checkConstraints" );

        function checkHasMany() {
            var SELF = this;
            each( Superclass.$hasMany, function( it, i ) {
                for( var a in SELF[ i ] ) {
                    var entry = SELF[ i ][ a ];
                    if( !(entry instanceof it) ) {
                        throw FancyDomainError( "hasMany", i + " must be instance of " + (it.name === "Superclass" ? "the designated Domain" : it.name) );
                    }
                }
            } );
        }


        addMethods( options.methods, Superclass );

        Superclass.prototype.constructor      = Superclass;
        Superclass.prototype.checkConstraints = checkConstraints;
        Superclass.prototype.checkHasMany     = checkHasMany;
        return Superclass;
    }


    Fancy.domain = Domain;
})( Fancy );
