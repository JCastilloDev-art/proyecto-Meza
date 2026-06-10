<?php
// index.php - Veterinaria | MongoDB backend

// ── Captura errores fatales y los devuelve como JSON ─────────────
ini_set('display_errors', 0);
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => "PHP Error [$errno]: $errstr en $errfile:$errline"]);
    exit();
});
register_shutdown_function(function() {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        header('Content-Type: application/json');
        echo json_encode(['ok' => false, 'error' => 'Fatal: ' . $e['message'] . ' en ' . $e['file'] . ':' . $e['line']]);
    }
});

// ── Autoload de Composer ──────────────────────────────────────────
$autoload = __DIR__ . '/../vendor/autoload.php';if (!file_exists($autoload)) {
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'vendor/autoload.php no encontrado. Ejecuta: composer require mongodb/mongodb']);
    exit();
}
require_once $autoload;

// ── Verificar extensión MongoDB ───────────────────────────────────
if (!extension_loaded('mongodb')) {
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'Extensión PHP mongodb no está cargada. Verifica php.ini: extension=mongodb']);
    exit();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ── Configuración ────────────────────────────────────────────────
define('MONGO_URI', 'mongodb+srv://Castillo:jaredyvicky@cluster0.ifohxwq.mongodb.net/?appName=Cluster0');
define('DB_NAME',   'veterinaria');

// ── Conexión ─────────────────────────────────────────────────────
function getDB() {
    static $db = null;
    if ($db === null) {
        $client = new MongoDB\Client(MONGO_URI);
        $db     = $client->{DB_NAME};
    }
    return $db;
}

// ── Router ────────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    if ($method === 'POST') {
        $body      = json_decode(file_get_contents('php://input'), true);
        $coleccion = $body['coleccion'] ?? '';
        $documento = $body['documento']  ?? [];

        if (!$coleccion || !$documento) {
            echo json_encode(['ok' => false, 'error' => 'Faltan datos (coleccion / documento)']);
            exit();
        }

        insertar($coleccion, $documento);

    } elseif ($method === 'GET' && $action === 'listar') {
        $coleccion = $_GET['coleccion'] ?? '';
        if (!$coleccion) {
            echo json_encode(['ok' => false, 'error' => 'Falta coleccion']);
            exit();
        }
        listar($coleccion);

    } else {
        echo json_encode(['ok' => false, 'error' => 'Metodo o accion no soportado']);
    }
} catch (Exception $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
} catch (Error $e) {
    echo json_encode(['ok' => false, 'error' => 'Error PHP: ' . $e->getMessage()]);
}

// ── Funciones ────────────────────────────────────────────────────

function insertar(string $coleccion, array $documento): void {
    $db     = getDB();
    $col    = $db->selectCollection($coleccion);
    $result = $col->insertOne($documento);

    if ($result->getInsertedCount() === 1) {
        echo json_encode([
            'ok'  => true,
            'id'  => (string) $result->getInsertedId()
        ]);
    } else {
        echo json_encode(['ok' => false, 'error' => 'No se inserto el documento']);
    }
}

function listar(string $coleccion): void {
    $db     = getDB();
    $col    = $db->selectCollection($coleccion);
    $cursor = $col->find(
        [],
        ['sort' => ['_id' => -1], 'limit' => 50]
    );

    $docs = [];
    foreach ($cursor as $doc) {
        $arr        = (array) $doc->jsonSerialize();
        $arr['_id'] = (string) $arr['_id'];
        $docs[]     = $arr;
    }

    echo json_encode(['ok' => true, 'documentos' => $docs]);
}
?>
