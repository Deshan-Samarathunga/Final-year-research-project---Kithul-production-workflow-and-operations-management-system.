import 'package:flutter/material.dart';

const kithulBlue = Color(0xFF3159D4);
const kithulOrange = Color(0xFFF36C3D);
const kithulGreen = Color(0xFF2F9467);
const kithulInk = Color(0xFF0F172A);
const kithulMuted = Color(0xFF64748B);
const kithulSurface = Color(0xFFF7F9FC);

ThemeData buildKithulTheme() {
  final colorScheme = ColorScheme.fromSeed(
    seedColor: kithulBlue,
    primary: kithulBlue,
    secondary: kithulOrange,
    tertiary: kithulGreen,
    surface: Colors.white,
  );

  return ThemeData(
    useMaterial3: true,
    fontFamily: 'Roboto',
    colorScheme: colorScheme,
    scaffoldBackgroundColor: kithulSurface,
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: kithulInk,
      elevation: 0,
      centerTitle: false,
      surfaceTintColor: Colors.white,
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: kithulBlue, width: 1.4),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: kithulBlue,
        foregroundColor: Colors.white,
        minimumSize: const Size(48, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: kithulInk,
        minimumSize: const Size(48, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        side: const BorderSide(color: Color(0xFFCBD5E1)),
      ),
    ),
    textTheme: const TextTheme(
      titleLarge: TextStyle(fontWeight: FontWeight.w800, color: kithulInk),
      titleMedium: TextStyle(fontWeight: FontWeight.w800, color: kithulInk),
      bodyMedium: TextStyle(color: kithulInk),
      labelLarge: TextStyle(fontWeight: FontWeight.w700),
    ),
  );
}
