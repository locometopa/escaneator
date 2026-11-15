// Sin ventana de consola en la versión instalada.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    escaneator_lib::run()
}
