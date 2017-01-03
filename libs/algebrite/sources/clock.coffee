###
 Convert complex z to clock form

	Input:		push	z

	Output:		Result on stack

	clock(z) = mag(z) * (-1) ^ (arg(z) / pi)

	For example, clock(exp(i pi/3)) gives the result (-1)^(1/3)
###

# P.S. I couldn't find independent definition/aknowledgment
# of a "clock form" anywhere on the web, seems like a
# definition specific to eigenmath.


Eval_clock = ->
	push(cadr(p1))
	Eval()
	clockform()

clockform = ->
	save()
	#if 1
	p1 = pop()
	push(p1)
	mag()
	push_integer(-1)
	push(p1)
	arg()
	if evaluatingAsFloats
		push_double(Math.PI)
	else
		push(symbol(PI))
	divide()
	power()
	multiply()
	#else
	###
	p1 = pop()
	push(p1)
	mag()
	push(symbol(E))
	push(p1)
	arg()
	push(imaginaryunit)
	multiply()
	power()
	multiply()
	###
	#endif
	restore()



