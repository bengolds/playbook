class Snippet
  @index: 0
  @namespace: () -> "_sn_#{++Snippet.index}_"

  @load: (language, name, code) ->
    program          = language.parse   name, code
    [sigs, compiler] = language.compile program
    new Snippet language, sigs, compiler, name, code

  constructor: (@language, @_signatures, @_compiler, @_name, @_original) ->
    @namespace  = null
    @code       = null

    @main       = null
    @entry      = null

    @uniforms   = null
    @externals  = null
    @symbols    = null
    @attributes = null
    @varyings   = null

    # Tidy up object for export
    delete @language    if !@language
    delete @_signatures if !@_signatures
    delete @_compiler   if !@_compiler
    delete @_original   if !@_original

    # Insert snippet name if not provided
    @_name = @_signatures?.main.name if !@_name

  clone: () ->
    new Snippet @language, @_signatures, @_compiler, @_name, @_original

  bind: (config, uniforms, namespace, defines) ->

    # Alt syntax (namespace, uniforms, defines)
    if uniforms == '' + uniforms
      [namespace, uniforms, defines] = [uniforms, namespace ? {}, defines ? {}]
    # Alt syntax (uniforms, defines)
    else if namespace != '' + namespace
      [defines, namespace] = [namespace ? {}, undefined]

    # Prepare data structure
    @main       = @_signatures.main
    @namespace  = namespace ? @namespace ? Snippet.namespace()
    @entry      = @namespace + @main.name

    @uniforms   = {}
    @varyings   = {}
    @attributes = {}
    @externals  = {}
    @symbols    = []
    exist       = {}
    exceptions  = {}

    # Handle globals and locals for prefixing
    global = (name) ->
      exceptions[name] = true
      name
    local  = (name) =>
      @namespace + name

    # Apply config
    global key for key in config.globals if config.globals
    _u = if config.globalUniforms   then global else local
    _v = if config.globalVaryings   then global else local
    _a = if config.globalAttributes then global else local
    _e = local

    # Build finalized properties
    x = (def)       =>       exist[def.name]           = true
    u = (def, name) =>   @uniforms[_u name ? def.name] = def
    v = (def)       =>   @varyings[_v def.name]        = def
    a = (def)       => @attributes[_a def.name]        = def
    e = (def)       =>
                        name = _e def.name
                        @externals[name]               = def
                        @symbols.push name

    redef = (def) -> {type: def.type, name: def.name, value: def.value}

    x def       for def in @_signatures.uniform
    u redef def for def in @_signatures.uniform
    v redef def for def in @_signatures.varying
    e def       for def in @_signatures.external
    a redef def for def in @_signatures.attribute
    u def, name for name, def of uniforms when exist[name]

    @body = @code = @_compiler @namespace, exceptions, defines

    # Adds defs to original snippet for inspection
    if defines
      defs = ("#define #{k} #{v}" for k, v of defines).join '\n'
      @_original = [defs, "//----------------------------------------", @_original].join "\n" if defs.length

    null

module.exports = Snippet