import 'package:flutter/material.dart';

class NewLuminoBackground extends StatelessWidget {
  const NewLuminoBackground({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFF171B2A),
            Color(0xFF111522),
          ],
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment(-0.8, -1.0),
                  radius: 1.2,
                  colors: [
                    Color(0x66505FD1),
                    Color(0x00151A28),
                  ],
                ),
              ),
            ),
          ),
          IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment(0.9, -0.8),
                  radius: 1.1,
                  colors: [
                    Color(0x554B3B86),
                    Color(0x00151A28),
                  ],
                ),
              ),
            ),
          ),
          IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment(0.25, 1.1),
                  radius: 1.3,
                  colors: [
                    Color(0x44404E9A),
                    Color(0x00151A28),
                  ],
                ),
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }
}