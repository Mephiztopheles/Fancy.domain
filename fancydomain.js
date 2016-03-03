(function ( Fancy ) {
    /* extend( Function.prototype, {
         wrap: function wrap( wrapper ) {
             var fn = this;
             return function () {
                 return wrapper.apply( this, [ fn.bind( this ) ].concat( Array.prototype.slice.call( arguments ) ) );
             }
         }
     } );*/

    function wrap( fn, wrapper ) {
        return function () {
            return wrapper.apply( this, [ fn.bind( this ) ].concat( Array.prototype.slice.call( arguments ) ) );
        }
    }

    function secureFunction( fn, msg ) {
        var r      = function () {return "function " + msg + "() { [native code] }";};
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
        each( functions, function ( value, property ) {
            var o = {};
            if ( Fancy.getType( value ) === "function" ) {
                o.value = wrap( (function ( m ) {
                    return function () { return $super && $super[ m ] && $super[ m ].apply( this, arguments ); };
                })( property ), value );

                o.value.valueOf = (function ( m ) {
                    return function () { return m.valueOf.call( m ); };
                })( value );

                o.value.toString = (function ( m ) {
                    return function () { return m.toString.call( m ); };
                })( value );
            }
            Object.defineProperty( fn.prototype, property, o );
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
                Object.defineProperty( a, i, Object.getOwnPropertyDescriptor( it, i ) );
            }
        } );
        return a;
    }

    function Subclass() {}

    function Domain( name, data, options ) {
        var parent = null;
        if ( Fancy.getType( name ) === "function" ) {
            parent = name;
        } else {
            options = data;
            data    = name;
            name    = null;
        }
        options = options || {};
        function Superclass( object ) {
            if ( !(this instanceof Superclass) ) {
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
            parent.$subclasses.push( Superclass );
            extend( Superclass.$properties, parent.$properties );
            extend( Superclass.$constraints, parent.$constraints );
        }
        function init( object ) {
            var SELF = this;
            extend( SELF, Superclass.$properties, object );
            each( options.transients, function ( it, i ) {
                Object.defineProperty( SELF, i, it );
            } );
            each( options.hasMany, function ( it, i ) {
                var list = object[ i ] || [];

                Object.defineProperty( SELF, i, {
                    get: function () {
                        return list;
                    },
                    set: function ( value ) {
                        if ( Fancy.getType( value ) === "array" ) {
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
                if ( it.nullable === false && SELF[ i ] === null ) {
                    throw FancyDomainError( "nullable", "You can not set \"" + i + "\" as null" );
                }
            } );
            return SELF;
        }

        secureFunction( checkConstraints, "checkConstraints" );

        function checkHasMany() {
            var SELF = this;
            each( Superclass.$hasMany, function ( it, i ) {
                for ( var a in SELF[ i ] ) {
                    var entry = SELF[ i ][ a ];
                    if ( !(entry instanceof it) ) {
                        throw FancyDomainError( "hasMany", i + " must be instance of " + (it.name === "Superclass" ? "the designated Domain" : it.name) );
                    }
                }
            } );
        }

        secureFunction( checkHasMany, "checkHasMany" );


        addMethods( options.methods, Superclass );

        Superclass.prototype.constructor      = Superclass;
        Superclass.prototype.checkConstraints = checkConstraints;
        Superclass.prototype.checkHasMany     = checkHasMany;
        return Superclass;
    }


    Fancy.domain = Domain;
})( Fancy );


function createDomain() {
    function Domain( props ) {
        for ( var i in Domain.properties ) {
            if ( Domain.properties.hasOwnProperty( i ) ) {
                setProperty( this, i, Domain.properties[ i ], props ? (props[ i ] || null) : null );
            }
        }
        if ( Domain.transients ) {
            for ( i in Domain.transients ) {
                if ( Domain.transients.hasOwnProperty( i ) ) {
                    Object.defineProperty( this, i, { get: Domain.transients[ i ], enumerable: false } );
                }
            }
        }
        if ( Domain.hasMany ) {
            for ( i in Domain.hasMany ) {
                if ( Domain.hasMany.hasOwnProperty( i ) ) {
                    setHasMany( this, i, Domain.hasMany[ i ] );
                }
            }
        }
    }

    Domain.constraints = {};
    Domain.prototype   = {};
    Object.defineProperty( Domain.prototype, "save", {
        enumerable  : false,
        value       : function () {},
        configurable: false,
        writable    : true
    } );
    Object.defineProperty( Domain.prototype, "delete", {
        enumerable  : false,
        value       : function () {},
        configurable: false,
        writable    : true
    } );

    function ensureValue( value, name, old ) {
        var constraints = Domain.constraints && Domain.constraints[ name ];
        if ( constraints ) {
            var type, nullable;
            if ( constraints.hasOwnProperty( "nullable" ) ) {
                if ( constraints.nullable === false ) {
                    nullable = value !== null;
                } else {
                    nullable = true;
                }
            } else {
                nullable = true;
            }
            if ( constraints.hasOwnProperty( "type" ) ) {
                if ( Fancy.getType( constraints.type ) === "string" ) {
                    type = Fancy.getType( value ).toLowerCase() === constraints.type.toLowerCase();
                } else {
                    console.log( value, constraints.type );
                    type = value instanceof constraints.type;
                }
            }
            console.log( type, nullable );
            if ( type && nullable ) {
                return value;
            } else {
                return old;
            }
        }
        return value;
    }

    function setProperty( me, name, type, givenValue ) {
        if ( !Domain.constraints[ name ] ) {
            Domain.constraints[ name ] = {};
        }
        Domain.constraints[ name ].type = type;
        var value                       = Domain.constraints[ name ].default || givenValue;
        if ( !Domain.constraints[ name ].nullable && value === null ) {
            if ( Fancy.getType( type ) === "string" ) {
                switch ( type.toLowerCase() ) {
                    case "string":
                        value = "";
                        break;
                    case "number":
                        value = 0;
                        break;
                    case "array":
                        value = [];
                        break;
                    case "object":
                        value = {};
                        break;
                    case "boolean":
                        value = false;
                        break;
                }
            }
        }
        Object.defineProperty( me, name, {
            get         : function () {
                return value
            },
            set         : function ( v ) {
                var ensured = ensureValue( v, name, value );
                value       = ensured;
                return ensured;
            },
            enumerable  : true,
            configurable: false
        } )
    }

    function setHasMany( me, name ) {
        var value = [];
        Object.defineProperty( me, name, {
            get: function () {
                return value;
            },
            set: function ( val ) {
                if ( Fancy.getType( val ) === "array" ) {
                    return val;
                }
                return value;
            }
        } );
    }

    return Domain;
}
function bootStrapDomain( Domain ) {
    var i;
    if ( Domain.constraints ) {
        for ( i in Domain.constraints ) {
            if ( Domain.constraints.hasOwnProperty( i ) ) {
                if ( Domain.constraints[ i ].static ) {
                    Domain[ i ] = Domain.constraints[ i ].default;
                }
            }
        }
    }
}

var Horse         = createDomain();
Horse.properties  = {
    "class"             : "String",
    id                  : "Number",
    "name"              : "String",
    identificationNumber: "string",
    mother              : Horse
};
Horse.constraints = {
    "class": {
        "default": "de.proequi.horse.Horse",
        "static" : true
    },
    "id"   : {
        nullable: true
    }
};
Horse.transients  = {
    displayName: function () {
        return this.name || this.identificationNumber;
    }
};
Horse.hasMany     = {
    childs: Horse
};
bootStrapDomain( Horse );