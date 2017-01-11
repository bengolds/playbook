# Evaluate a user defined function


#define F p3 # F is the function body
#define A p4 # A is the formal argument list
#define B p5 # B is the calling argument list
#define S p6 # S is the argument substitution list

# we got here because there was a function invocation and
# it's not been parsed (and consequently tagged) as any
# system function.
# So we are dealing with another function.
# The function could be actually defined, or not yet,
# so we'll deal with both cases.

Eval_user_function = ->

	# Use "derivative" instead of "d" if there is no user function "d"

	if DEBUG then console.log "Eval_user_function evaluating: " + car(p1)
	if (car(p1) == symbol(SYMBOL_D) && get_binding(symbol(SYMBOL_D)) == symbol(SYMBOL_D))
		Eval_derivative()
		return

	# we expect to find either the body and
	# formula arguments, OR, if the function
	# has not been defined yet, then the
	# function will just contain its own name, as
	# all undefined variables.
	bodyAndFormalArguments = get_binding(car(p1));

	p3 = car(cdr(bodyAndFormalArguments))  # p3 is function body F
	# p4 is the formal argument list
	# that is also contained here in the FUNCTION node 
	p4 = car(cdr(cdr(bodyAndFormalArguments)))

	p5 = cdr(p1); # p5 is B

	# example:
	#  f(x) = x+2
	# then:
	#  p3.toString() = "x + 2"
	#  p4 = x
	#  p5 = 2

	# Undefined function?
	if (bodyAndFormalArguments == car(p1)) # p3 is F
		h = tos
		push(bodyAndFormalArguments); # p3 is F
		p1 = p5; # p5 is B
		while (iscons(p1))
			push(car(p1))
			Eval()
			p1 = cdr(p1)
		list(tos - h)
		return

	# Create the argument substitution list p6(S)

	p1 = p4; # p4 is A
	p2 = p5; # p5 is B
	h = tos
	while (iscons(p1) && iscons(p2))
		push(car(p1))
		push(car(p2))
		Eval()
		p1 = cdr(p1)
		p2 = cdr(p2)

	list(tos - h)
	p6 = pop(); # p6 is S

	# Evaluate the function body

	push(p3); # p3 is F
	if (iscons(p6)) # p6 is S
		push(p6); # p6 is S
		rewrite_args()
	Eval()

# Rewrite by expanding symbols that contain args

rewrite_args = ->
	n = 0
	save()

	p2 = pop(); # subst. list
	p1 = pop(); # expr

	if (istensor(p1))
		n = rewrite_args_tensor()
		restore()
		return n

	if (iscons(p1))
		h = tos
		push(car(p1)); # Do not rewrite function name
		p1 = cdr(p1)
		while (iscons(p1))
			push(car(p1))
			push(p2)
			n += rewrite_args()
			p1 = cdr(p1)
		list(tos - h)
		restore()
		return n

	# If not a symbol then done

	if (!issymbol(p1))
		push(p1)
		restore()
		return 0

	# Try for an argument substitution first

	p3 = p2
	while (iscons(p3))
		if (p1 == car(p3))
			push(cadr(p3))
			restore()
			return 1
		p3 = cddr(p3)

	# Get the symbol's binding, try again

	p3 = get_binding(p1)
	push(p3)
	if (p1 != p3)
		push(p2); # subst. list
		n = rewrite_args()
		if (n == 0)
			pop()
			push(p1); # restore if not rewritten with arg

	restore()
	return n

rewrite_args_tensor = ->
	n = 0
	i = 0
	push(p1)
	copy_tensor()
	p1 = pop()
	for i in [0...p1.tensor.nelem]
		push(p1.tensor.elem[i])
		push(p2)
		n += rewrite_args()
		p1.tensor.elem[i] = pop()

	if p1.tensor.nelem != p1.tensor.elem.length
		console.log "something wrong in tensor dimensions"
		debugger

	push(p1)
	return n
