import 'package:flutter/material.dart';

class NewLuminoTheme {
  static ThemeData dark() {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF0C0D0F),
      colorScheme: const ColorScheme.dark(
        surface: Color(0xFF0C0D0F),
      ),
      useMaterial3: true,
      fontFamily: 'sans',
    );
  }
}