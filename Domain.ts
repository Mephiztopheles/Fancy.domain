class Domain {

    static isSet( value ) {
        return value !== null && value !== undefined;
    }

    static each( object, callback ) {
        for ( let index in object ) {
            if ( object.hasOwnProperty( index ) ) {
                let result = callback.apply( object[ index ], [ object[ index ], index ] );
                if ( result !== undefined ) {
                    return result;
                }
            }
        }
    }

    static extend( extendable, ...objects ) {
        Domain.each( objects, function ( object ) {
            Domain.each( object, function ( value, property ) {
                if ( Domain.type( value ) === "object" ) {
                    if ( Domain.type( extendable[ property ] ) !== "object" ) {
                        extendable[ property ] = {};
                    }
                    Domain.extend( extendable[ property ], value );
                } else if ( Domain.type( value ) === "array" ) {
                    if ( Domain.type( extendable[ property ] ) !== "array" ) {
                        extendable[ property ] = [];
                    }
                    Domain.extend( extendable[ property ], value );
                } else if ( Domain.type( value ) === "date" ) {
                    extendable[ property ] = new Date( value );
                } else {
                    extendable[ property ] = value;
                }
            } );
        } );
    }

    static type = (() => {
        const types = [];
        "Boolean Number String Function Array Date RegExp Object Error".split( " " ).forEach( function ( name ) {
            types[ "[object " + name + "]" ] = name.toLowerCase();
        } );

        return function ( object ) {
            if ( object === null ) {
                return object + "";
            }
            return typeof object === "object" || typeof object === "function" ? types[ toString.call( object ) ] || "object" : typeof object;
        }
    })();

    constructor( Class ) {

        Domain.each( Class.$constraints, function ( descriptor, property ) {
            if ( descriptor.type === Array || Object.getPrototypeOf( descriptor.type ) === Array ) {
                throw  new TypeError( "Array is not supported as property" );
            }
        } );

        if ( !Class[ Domain.config.properties.class.name ] ) {
            Class[ Domain.config.properties.class.name ] = Class.name;
        }
        if ( !Domain.config.properties.id || !Domain.config.properties.id.name ) {
            Class.$uid = 0;
        }
        let methods = {
            [Domain.config.properties.validate.name]:    {
                value:        function ( join = "\n" ) {
                    const errors = [];
                    const clazz  = this[ Domain.config.properties.class.name ];
                    const id     = Domain.isSet( this.$uid ) ? this.$uid : this[ Domain.config.properties.id.name ];
                    for ( const property in Class.$constraints ) {
                        if ( Class.$constraints.hasOwnProperty( property ) ) {
                            let descriptor = Class.$constraints[ property ];
                            if ( descriptor.nullable === false && !Domain.isSet( this[ property ] ) ) {
                                errors.push( Domain.config.validator.nullable( property, clazz, id ) );
                            } else if ( Domain.isSet( this[ property ] ) && ((descriptor.type !== this[ property ].constructor) && (Object.getPrototypeOf( this[ property ].constructor ) !== descriptor.type)) ) {
                                errors.push( Domain.config.validator.type( property, clazz, id, descriptor ) );
                            } else if ( descriptor.min || descriptor.max ) {
                                if ( descriptor.type.name === "String" ) {
                                    if ( this[ property ].length < descriptor.min ) {
                                        errors.push( Domain.config.validator.min( property, clazz, id, descriptor ) );
                                    } else if ( this[ property ].lenth > descriptor.max ) {
                                        errors.push( Domain.config.validator.max( property, clazz, id, descriptor ) );
                                    }
                                } else if ( descriptor.type.name === "Date" || descriptor.type.name === "Number" ) {
                                    if ( this[ property ] < descriptor.min ) {
                                        errors.push( Domain.config.validator.min( property, clazz, id, descriptor ) );
                                    } else if ( this[ property ] > descriptor.max ) {
                                        errors.push( Domain.config.validator.max( property, clazz, id, descriptor ) );
                                    }
                                } else {
                                    throw new TypeError( "Wrong usage of min and max! Those values can only be bound to String, Number and Date" );
                                }
                            } else if ( descriptor.validator && Domain.isSet( this[ property ] ) ) {
                                let validated = descriptor.validator.apply( this, [ this[ property ] ] );
                                if ( Domain.isSet( validated ) ) {
                                    if ( validated === false ) {
                                        errors.push( Domain.config.validator.invalid( property, clazz, id ) );
                                    } else if ( validated !== true && validated ) {
                                        errors.push( validated );
                                    }
                                }
                            }
                        }
                    }
                    if ( errors.length ) {
                        if ( join ) {
                            throw errors.join( join );
                        } else {
                            return errors;
                        }
                    }

                    return true;
                },
                enumerable:   false,
                writable:     Domain.config.properties.validate.writable,
                configurable: Domain.config.properties.validate.configurable
            },
            [Domain.config.properties.constructor.name]: {
                value:        function ( map = {} ) {
                    Domain.each( Class.$constraints, ( descriptor, property ) => {
                        if ( Domain.isSet( map[ property ] ) ) {
                            if ( map[ property ].constructor === descriptor.type || (Object.getPrototypeOf( map[ property ].constructor ) === descriptor.type) ) {
                                this[ property ] = map[ property ];
                            } else {
                                switch ( descriptor.type ) {
                                    case Date:
                                        this[ property ] = new Date( map[ property ] );
                                        break;
                                    default:
                                        if ( descriptor.assign ) {
                                            descriptor.assign.apply( this, [ map[ property ] ] );
                                        } else {
                                            if ( Domain.config.rejectOnMismatch ) {
                                                throw new TypeError( `got unsuspected type for ${this[ Domain.config.properties.class.name ]}.${property}: ${Domain.type( map[ property ] )}` );
                                            } else if ( Domain.config.rejectOnMismatch === null ) {
                                                this[ property ] = null;
                                            } else {
                                                this[ property ] = map[ property ];
                                            }
                                        }
                                        break;
                                }
                            }
                        }
                        if ( this[ property ] === undefined ) {
                            if ( descriptor.hasOwnProperty( "defaultValue" ) ) {
                                if ( Domain.type( descriptor.defaultValue ) === "function" ) {
                                    this[ property ] = descriptor.defaultValue.apply( this );
                                } else {
                                    this[ property ] = descriptor.defaultValue;
                                }
                                if ( this[ property ] === undefined ) {
                                    this[ property ] = null;
                                }
                            } else {
                                this[ property ] = null;
                            }
                        }
                    } );
                    if ( Domain.isSet( Class.$uid ) ) {
                        Object.defineProperty( this, "$uid", {
                            value:    ++Class.$uid,
                            writable: false
                        } );
                    } else {
                        if ( !Domain.isSet( this[ Domain.config.properties.id.name ] ) ) {
                            if ( Domain.isSet( map[ Domain.config.properties.id.name ] ) ) {
                                this[ Domain.config.properties.id.name ] = map[ Domain.config.properties.id.name ];
                            } else {
                                this[ Domain.config.properties.id.name ] = null;
                            }
                        }
                    }

                    Object.defineProperty( this, Domain.config.properties.flush.name, {
                        value:        function () {
                            const flush = {};
                            Domain.each( Class.$constraints, ( descriptor, property ) => {
                                switch ( Domain.type( this[ property ] ) ) {
                                    case "object":
                                        flush[ property ] = {
                                            "id":       this[ property ].$uid || this[ property ][ Domain.config.properties.id.name ],
                                            "class":    this[ property ][ Domain.config.properties.class.name ],
                                            "original": this[ property ]
                                        };
                                        break;
                                    case "date":
                                        flush[ property ] = {
                                            value:    new Date( this[ property ] ),
                                            original: this[ property ]
                                        };
                                        break;
                                    default:
                                        flush[ property ] = this[ property ];
                                        break;
                                }
                            } );
                            Object.defineProperty( this, Domain.config.properties.dirty.name, {
                                get:          function () {
                                    const dirty = {};
                                    Domain.each( Class.$constraints, ( descriptor, property ) => {
                                        switch ( Domain.type( this[ property ] ) ) {
                                            case "object":
                                                if ( flush[ property ].id !== (this[ property ].$uid || this[ property ][ Domain.config.properties.id.name ]) || flush[ property ].class !== this[ property ][ Domain.config.properties.class.name ] ) {
                                                    dirty[ property ] = {
                                                        "old": flush[ property ].original,
                                                        "new": this[ property ]
                                                    };
                                                }
                                                break;
                                            case "date":
                                                if ( new Date( flush[ property ].value ).getTime() !== new Date( this[ property ] ).getTime() ) {
                                                    dirty[ property ] = {
                                                        "old": flush[ property ].original,
                                                        "new": this[ property ]
                                                    };
                                                }
                                                break;
                                            default:
                                                if ( flush[ property ] !== this[ property ] ) {
                                                    dirty[ property ] = {
                                                        "old": flush[ property ],
                                                        "new": this[ property ]
                                                    };
                                                }
                                                break;
                                        }
                                    } );
                                    return Object.keys( dirty ).length ? dirty : false;
                                },
                                configurable: Domain.config.properties.dirty.configurable
                            } );
                            return this;
                        },
                        writable:     false,
                        configurable: Domain.config.properties.flush.configurable
                    } );
                    this[ Domain.config.properties.flush.name ]();
                },
                enumerable:   false,
                writable:     Domain.config.properties.constructor.writable,
                configurable: Domain.config.properties.constructor.configurable
            },
            [Domain.config.properties.class.name]:       {
                value:        Class[ Domain.config.properties.class.name ],
                enumerable:   false,
                writable:     Domain.config.properties.class.writable,
                configurable: Domain.config.properties.class.configurable
            }
        };
        Domain.each( Domain.config.properties, function ( config, property ) {
            if ( !config.name && !methods[ property ] ) {
                methods[ property ] = config;
            }
        } );

        Object.defineProperties( Class.prototype, methods );
        if ( Class.$transients ) {
            Object.defineProperties( Class.prototype, Class.$transients );
        }
    }

    static config = {
        rejectOnMismatch: true,
        properties:       {
            "dirty":       {
                name:         "$dirty",
                configurable: false,
                writable:     false
            },
            "validate":    {
                name:         "$validate",
                configurable: true,
                writable:     false
            },
            "constructor": {
                name:         "$constructor",
                configurable: true,
                writable:     false
            },
            "class":       {
                name:         "class",
                configurable: false,
                writable:     false
            },
            "id":          {
                name: "id"
            },
            "flush":       {
                name:         "$flush",
                configurable: false
            }
        },
        validator:        {
            nullable: ( property, clazz, id ) => `Property "${property}" of ${clazz}:${id} is not nullable`,
            invalid:  ( property, clazz, id ) => `Property "${property}" of ${clazz}:${id} is invalid`,
            type:     ( property, clazz, id, descriptor ) => `Property "${property}" of ${clazz}:${id} must be type of ${descriptor.type.name}`,
            max:      ( property, clazz, id, descriptor ) => {
                switch ( descriptor.type.name ) {
                    case "Date":
                        return `Property "${property}" of ${clazz}:${id} can't be later than ${descriptor.max}`;
                    case "String":
                        return `Property "${property}" of ${clazz}:${id} can't be longer than ${descriptor.max} characters`;
                    case "Number":
                        return `Property "${property}" of ${clazz}:${id} can't be greater than ${descriptor.max}`;
                }
            },
            min:      ( property, clazz, id, descriptor ) => {
                switch ( descriptor.type.name ) {
                    case "Date":
                        return `Property "${property}" of ${clazz}:${id} can't be earlier than ${descriptor.min}`;
                    case "String":
                        return `Property "${property}" of ${clazz}:${id} can't be shorter than ${descriptor.min} characters`;
                    case "Number":
                        return `Property "${property}" of ${clazz}:${id} can't be lower than ${descriptor.min}`;
                }
            }
        }
    };
}