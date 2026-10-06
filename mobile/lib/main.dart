import 'package:flutter/material.dart';

void main() {
  runApp(const NewLuminoApp());
}

class NewLuminoApp extends StatelessWidget {
  const NewLuminoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NewLumino',
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        appBar: AppBar(
          title: const Text('NewLumino'),
        ),
        body: const Center(
          child: Text('NewLumino Flutter foundation'),
        ),
      ),
    );
  }
}